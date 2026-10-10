/**
 * HotPot Delights — API + realtime server.
 *
 * Security model:
 *   - Every route except the health probe, the auth entry points and the public
 *     menu requires a valid JWT. Role checks happen here, on the server, from
 *     the token's claims — never from a request body field and never from a
 *     value the browser can edit in localStorage.
 *   - Order ownership is enforced on read and on write. A customer can only
 *     ever see or mutate their own orders.
 *   - Prices, totals, revenue and status transitions are all decided by the
 *     database layer, never by the request body.
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const neonClient = require('./neonClient');
const authMiddleware = require('./middleware/auth');
const { googleLoginHandler } = require('./controllers/googleAuth');

// ---------------------------------------------------------------------------
// Fail-fast configuration
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    '[fatal] JWT_SECRET is missing or shorter than 32 characters.\n' +
    '        Generate one with:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
    '        Refusing to start with a guessable signing key.'
  );
  process.exit(1);
}

if (!process.env.CLIENT_ORIGIN) {
  console.error(
    '[config] CLIENT_ORIGIN is not set.\n' +
    '        Set it to a comma-separated list of allowed browser origins.\n' +
    '        Example: CLIENT_ORIGIN=https://yourdomain.com'
  );
  process.exit(1);
}

const ALLOWED_ORIGINS = process.env.CLIENT_ORIGIN
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
});

// Behind a reverse proxy (Nginx, Render, Fly) this is required for the rate
// limiter to key on the real client IP instead of the proxy's.
app.set('trust proxy', 1);

app.use(helmet());
if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '256kb' }));

// ---------------------------------------------------------------------------
// File uploads — payment proof screenshots via Cloudinary
// ---------------------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'payment-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    public_id: (_req, file) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
      return `proof-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
});

const upload = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, GIF and WebP images are accepted.'));
  }
});


// The dashboard polls the order book every few seconds. A ceiling of 5,000 per
// 15 minutes was simultaneously "generous" and small enough that four open
// staff tabs exhausted it and every subsequent call 429'd. Write traffic is
// limited separately and much more tightly.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_READ) || 20000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_WRITE) || 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again later.' }
});
const handoverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many handover code attempts. Please wait 15 minutes before trying again.' }
});

app.use('/api/', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  return readLimiter(req, res, next);
});

const STAFF = ['admin', 'kitchen', 'delivery'];
const requireAuth = authMiddleware();
const requireAdmin = authMiddleware(['admin']);
const requireStaff = authMiddleware(STAFF);

/** Wrap an async handler so a rejection reaches the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tokenVersion: Number(user.tokenVersion ?? user.token_version ?? 1)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  avatarUrl: user.avatarUrl || null,
  role: user.role
});

/**
 * Only staff, and only for orders they are allowed to see in full, receive the
 * handover code. A customer receives it for their own order. A rider never
 * receives it — the rider has to be told it and type it in, which is the whole
 * point of the check.
 */
function pinVisibilityFor(req, order) {
  if (!order) return false;
  if (req.user.role === 'admin' || req.user.role === 'kitchen') return true;
  if (req.user.role === 'customer') return String(order.userId) === String(req.user.id);
  return false;
}

// ===========================================================================
// Health
// ===========================================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'HotPot Delights API', time: new Date().toISOString() });
});

// ===========================================================================
// Auth
// ===========================================================================
app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const phone = req.body.phone ? String(req.body.phone).trim() : null;

  console.log('[auth] Register attempt received');

  if (!name) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  try {
    const existing = await neonClient.findUserByEmail(email);
    if (existing) {
      console.warn('[auth] Registration conflict: account with this email already exists.');
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }

    // `role` is intentionally NOT read from the body. Self-registration can only
    // ever create a customer; staff accounts are provisioned by seed or promoted
    // by an authenticated admin via PATCH /api/admin/users/:id/role.
    const user = await neonClient.registerUser({ name, email, phone, password });
    console.log(`[auth] Registration success for user id: ${user.id} (role: ${user.role})`);
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('[auth] Database error during registration:', err.message);
    return res.status(500).json({ error: 'Database error occurred during registration. Please try again.' });
  }
}));

app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  console.log('[auth] Login attempt received');

  if (!email) {
    return res.status(400).json({ error: 'Please enter your email address.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Please enter your password.' });
  }

  try {
    const user = await neonClient.verifyLogin(email, password);
    if (!user) {
      console.warn('[auth] Login failed: invalid credentials');
      return res.status(401).json({ error: 'Invalid email address or password. Please verify your credentials.' });
    }
    console.log(`[auth] Login success for user id: ${user.id} (role: ${user.role})`);
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('[auth] Authentication error:', err.message);
    return res.status(500).json({ error: 'Authentication service error. Please try again.' });
  }
}));

app.post('/api/auth/google', authLimiter, wrap(async (req, res) => {
  await googleLoginHandler(req, res, neonClient, signToken);
}));

app.get('/api/auth/me', requireAuth, wrap(async (req, res) => {
  const user = await neonClient.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Account no longer exists.' });
  return res.json({ user: publicUser(user) });
}));

app.patch('/api/auth/me', requireAuth, wrap(async (req, res) => {
  const user = await neonClient.updateUserProfile(req.user.id, req.body);
  return res.json({ user: publicUser(user) });
}));

// ===========================================================================
// Menu (public read, staff write)
// ===========================================================================
app.get('/api/meals', wrap(async (req, res) => {
  res.json(await neonClient.getMeals());
}));

app.get('/api/meals/:id', wrap(async (req, res) => {
  const meal = await neonClient.getMealById(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Meal not found.' });
  return res.json(meal);
}));

app.post('/api/meals', requireAdmin, wrap(async (req, res) => {
  if (!req.body.name || !req.body.category) {
    return res.status(400).json({ error: 'Name and category are required.' });
  }
  const meal = await neonClient.createMeal(req.body);
  io.emit('meal_catalog_updated', meal);
  return res.status(201).json(meal);
}));

app.patch('/api/meals/:id', requireAdmin, wrap(async (req, res) => {
  const updated = await neonClient.updateMeal(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Meal not found.' });
  io.emit('meal_catalog_updated', updated);
  return res.json(updated);
}));

app.delete('/api/meals/:id', requireAdmin, wrap(async (req, res) => {
  const deleted = await neonClient.deleteMeal(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Meal not found.' });
  io.emit('meal_catalog_updated', { id: req.params.id, deleted: true });
  return res.json({ id: req.params.id, deleted: true });
}));

// ===========================================================================
// Orders
// ===========================================================================
app.get('/api/orders', requireAuth, wrap(async (req, res) => {
  const limit = req.query.limit;
  if (req.user.role === 'customer') {
    return res.json(await neonClient.getOrders({ userId: req.user.id, limit }));
  }
  const statuses = req.query.status ? String(req.query.status).split(',') : undefined;
  if (req.user.role === 'delivery') {
    const courier = await neonClient.findRiderForUser(req.user);
    const riderIds = [courier?.id, req.user.id].filter(Boolean).map(String);
    if (riderIds.length === 0 && !courier?.name) {
      return res.json([]);
    }
    return res.json(await neonClient.getOrders({
      riderId: riderIds,
      riderName: courier?.name,
      statuses,
      limit
    }));
  }
  return res.json(await neonClient.getOrders({ statuses, limit }));
}));

app.get('/api/orders/:id', requireAuth, wrap(async (req, res) => {
  const order = await neonClient.getOrderById(req.params.id, { includePin: true });
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const isOwner = String(order.userId) === String(req.user.id);
  if (req.user.role === 'customer' && !isOwner) {
    return res.status(403).json({ error: 'You can only view your own orders.' });
  }
  if (req.user.role === 'delivery') {
    const courier = await neonClient.findRiderForUser(req.user);
    const riderIds = [courier?.id, req.user.id].filter(Boolean).map(String);
    const isAssigned =
      (order.riderId && riderIds.includes(String(order.riderId))) ||
      (!order.riderId && courier?.name && order.riderName === courier.name);
    if (!isAssigned) {
      return res.status(403).json({ error: 'You can only view orders assigned to you.' });
    }
  }
  if (pinVisibilityFor(req, order)) {
    return res.json(order);
  }
  const { verificationPin, ...safeOrder } = order;
  return res.json(safeOrder);
}));

app.post('/api/orders', requireAuth, wrap(async (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  // Let the user specify a custom delivery name and phone during checkout.
  // Fall back to their account details if missing.
  const customerName = String(body.customerName || req.user.name).trim();
  const phone = String(body.phone || req.user.phone || '').trim();
  const address = String(body.address || '').trim();

  if (!customerName) return res.status(400).json({ error: 'A delivery name is required.' });
  if (!phone) return res.status(400).json({ error: 'A phone number is required.' });
  if (body.orderType !== 'takeout' && !address) {
    return res.status(400).json({ error: 'A delivery address is required.' });
  }

  // The customer id is taken from the token, never from the body.
  const order = await neonClient.createOrder({
    ...body,
    userId: req.user.id,
    customerName,
    phone: String(phone).trim(),
    address,
    paymentStatus: 'pending'
  });
  // Deliver new orders only to kitchen and admin (no public PII broadcast)
  io.to('role_admin').to('role_kitchen').emit('new_order_placed', order);
  return res.status(201).json(order);
}));

app.patch('/api/orders/:id/status', requireAuth, wrap(async (req, res) => {
  const { id } = req.params;
  const { status, riderName } = req.body;
  
  // Security: Non-staff can ONLY set their own order to 'delivered' or 'cancelled'
  if (req.user.role !== 'admin' && req.user.role !== 'kitchen' && req.user.role !== 'delivery') {
    if (status !== 'delivered' && status !== 'cancelled') {
      return res.status(403).json({ error: 'Customers can only confirm delivery or cancel orders.' });
    }
    const orderCheck = await neonClient.getOrderById(id);
    if (!orderCheck || String(orderCheck.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You do not have permission to update this order.' });
    }
  }

  const order = await neonClient.updateOrderStatus(id, status, { riderName });
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', order);
  const { verificationPin, ...safeOrder } = order;
  io.to(`order_${order.id}`).emit('live_order_status', safeOrder);
  io.to(`order_${order.id}`).emit('order_status_updated', safeOrder);
  if (order.status === 'delivered') {
    io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());
  }
  return res.json(order);
}));

app.patch('/api/orders/:id/notes', requireStaff, wrap(async (req, res) => {
  res.json(await neonClient.updateOrderNotes(req.params.id, req.body.notes));
}));

app.delete('/api/orders/:id', requireAuth, wrap(async (req, res) => {
  const existing = await neonClient.getOrderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found.' });

  const isOwner = String(existing.userId) === String(req.user.id);
  const isStaff = STAFF.includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ error: 'You do not have permission to manage this order.' });
  }

  // Hard deletion requested by staff/admin
  if (req.query.permanent === 'true' || req.query.hard === 'true') {
    if (!isStaff) {
      return res.status(403).json({ error: 'Only staff can permanently delete orders.' });
    }
    await neonClient.deleteOrder(req.params.id);
    io.to('role_admin').to('role_kitchen').emit('order_deleted', { id: req.params.id });
    io.to(`order_${req.params.id}`).emit('order_deleted', { id: req.params.id });
    return res.json({ message: 'Order permanently deleted.', id: req.params.id });
  }

  const order = await neonClient.cancelOrder(req.params.id, { bypassGrace: isStaff });
  io.to('role_admin').to('role_kitchen').emit('order_cancelled', order);
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', order);
  io.to(`order_${order.id}`).emit('live_order_status', order);
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());
  return res.json({ message: 'Order cancelled.', order });
}));

app.delete('/api/orders/:id/permanent', requireStaff, wrap(async (req, res) => {
  const existing = await neonClient.getOrderById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found.' });

  await neonClient.deleteOrder(req.params.id);
  io.to('role_admin').to('role_kitchen').emit('order_deleted', { id: req.params.id, orderId: req.params.id });
  io.to(`order_${req.params.id}`).emit('order_deleted', { id: req.params.id, orderId: req.params.id });
  return res.json({ message: 'Order permanently deleted.', id: req.params.id });
}));

// ===========================================================================
// Payments
// ===========================================================================
/**
 * MoMo collection is NOT implemented against a real provider, so this endpoint
 * refuses rather than returning a fake `PENDING_USER_PIN` receipt. Wiring a
 * provider means posting to their gateway, then calling
 * `PATCH /api/orders/:id/payment` from their webhook — see setPaymentStatus.
 */
app.post('/api/payments/momo-checkout', requireAuth, wrap(async (req, res) => {
  return res.status(501).json({
    error: 'Mobile Money checkout is not configured on this deployment.',
    detail:
      'Set up an MTN MoMo merchant account and implement the callback in server.js before enabling this route.'
  });
}));

app.patch('/api/orders/:id/payment', requireStaff, wrap(async (req, res) => {
  const order = await neonClient.setPaymentStatus(req.params.id, req.body.paymentStatus, req.body.paymentRef);
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', order);
  const { verificationPin, ...safeOrder } = order;
  io.to(`order_${order.id}`).emit('live_order_status', safeOrder);
  io.to(`order_${order.id}`).emit('order_status_updated', safeOrder);
  return res.json(order);
}));

/**
 * POST /api/orders/:id/payment-proof
 * Customer uploads a screenshot/image of their payment.
 * The file is stored on disk, the path is saved in the DB, and the kitchen
 * is notified via Socket.IO so they can see it immediately.
 */
app.post('/api/orders/:id/payment-proof', requireAuth, upload.single('proof'), wrap(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file was uploaded. Please select a payment screenshot.' });
  }

  // Ownership check: only the order's owner may upload a proof.
  const existing = await neonClient.getOrderById(req.params.id);
  if (!existing) {
    // Clean up Cloudinary upload on error
    if (req.file.public_id) await cloudinary.uploader.destroy(req.file.public_id).catch(() => {});
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (req.user.role === 'customer' && String(existing.userId) !== String(req.user.id)) {
    if (req.file.public_id) await cloudinary.uploader.destroy(req.file.public_id).catch(() => {});
    return res.status(403).json({ error: 'You can only upload proof for your own orders.' });
  }

  // Save the Cloudinary URL directly to the database
  const cloudinaryUrl = req.file.path; // multer-storage-cloudinary sets path = secure_url
  const proofUrl = `/api/orders/${req.params.id}/payment-proof/file`;
  const order = await neonClient.setPaymentProof(req.params.id, cloudinaryUrl);

  // Notify kitchen in real-time
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', order);
  const { verificationPin, ...safeOrder } = order;
  io.to(`order_${order.id}`).emit('live_order_status', safeOrder);
  io.to(`order_${order.id}`).emit('order_status_updated', safeOrder);

  return res.status(201).json({ success: true, proofUrl, cloudinaryUrl, order });
}));

/**
 * GET /api/orders/:id/payment-proof/file
 * Serve the actual image to authorized viewers only (order owner or staff).
 */
app.get('/api/orders/:id/payment-proof/file', requireAuth, wrap(async (req, res) => {
  const order = await neonClient.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const isOwner = String(order.userId) === String(req.user.id);
  const isStaffUser = STAFF.includes(req.user.role);
  if (!isOwner && !isStaffUser) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  if (!order.paymentProofUrl) {
    return res.status(404).json({ error: 'No payment proof has been uploaded for this order.' });
  }

  // If it's a Cloudinary URL, redirect directly to it
  if (order.paymentProofUrl.startsWith('http')) {
    return res.redirect(order.paymentProofUrl);
  }

  // Legacy: serve from local disk (old uploads before Cloudinary)
  const UPLOADS_DIR = path.join(__dirname, 'uploads', 'payment-proofs');
  const filePath = path.join(UPLOADS_DIR, order.paymentProofUrl);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Payment proof file not found.' });
  }
  res.sendFile(filePath);
}));


app.patch('/api/users/:id/role', requireAdmin, wrap(async (req, res) => {
  const { role } = req.body;
  const updated = await neonClient.setUserRole(req.params.id, role);
  io.to(`user_${req.params.id}`).emit('auth_role_changed', { userId: req.params.id, role: updated.role });
  const userSockets = await io.in(`user_${req.params.id}`).fetchSockets();
  for (const s of userSockets) {
    s.disconnect(true);
  }
  return res.json(publicUser(updated));
}));

// ===========================================================================
// Vouchers
// ===========================================================================
app.get('/api/vouchers', requireAdmin, wrap(async (req, res) => {
  res.json(await neonClient.getVouchers());
}));

app.post('/api/vouchers', requireAdmin, wrap(async (req, res) => {
  if (!req.body.code) return res.status(400).json({ error: 'Voucher code is required.' });
  res.status(201).json(await neonClient.createVoucher(req.body));
}));

app.post('/api/vouchers/validate', requireAuth, wrap(async (req, res) => {
  if (!req.body.code) return res.status(400).json({ error: 'Voucher code is required.' });
  const voucher = await neonClient.validateVoucher(req.body.code);
  if (!voucher) return res.status(404).json({ error: 'That promo code is not valid.' });
  return res.json({ valid: true, voucher });
}));

// ===========================================================================
// Riders & dispatch
// ===========================================================================
app.get('/api/riders', requireStaff, wrap(async (req, res) => {
  res.json(await neonClient.getRiders());
}));

app.post('/api/riders', requireAdmin, wrap(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Rider name is required.' });
  const rider = await neonClient.createRider(req.body);
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());
  res.status(201).json(rider);
}));

app.patch('/api/riders/:id', requireAdmin, wrap(async (req, res) => {
  const rider = await neonClient.updateRider(req.params.id, req.body);
  if (!rider) return res.status(404).json({ error: 'Rider not found.' });
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());
  res.json(rider);
}));

app.patch('/api/riders/:id/availability', requireStaff, wrap(async (req, res) => {
  // A rider may only change their own duty status.
  if (req.user.role === 'delivery' && String(req.user.id) !== String(req.params.id)) {
    return res.status(403).json({ error: 'You can only change your own availability.' });
  }
  const rider = await neonClient.setRiderAvailability(req.params.id, req.body.is_available);
  io.to('role_admin').to('role_kitchen').emit('rider_availability_updated', rider);
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());
  res.json(rider);
}));

app.get('/api/riders/live-gps', requireStaff, wrap(async (req, res) => {
  res.json(await neonClient.getRiderLocations());
}));

app.post('/api/orders/:id/assign-rider', requireStaff, wrap(async (req, res) => {
  if (!req.body.riderId) return res.status(400).json({ error: 'riderId is required.' });
  const result = await neonClient.assignRider(req.params.id, req.body.riderId);

  // Send full assignment including PIN only to staff rooms
  io.to('role_admin').to('role_kitchen').emit('order_assigned_to_rider', result);
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', result.order);
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());

  // Customer room receives status update without the handover PIN
  const { verificationPin, ...safeOrder } = result.order;
  io.to(`order_${result.order.id}`).emit('live_order_status', safeOrder);
  io.to(`order_${result.order.id}`).emit('order_status_updated', safeOrder);
  if (result.order.riderId) {
    io.to(`rider_${result.order.riderId}`).emit('order_assigned_to_rider', { order: safeOrder });
    io.to(`rider_${result.order.riderId}`).emit('order_status_updated', safeOrder);
  }
  return res.json(result);
}));

// Smart Dispatch: Assign Manual / Custom Courier to Order
app.post('/api/orders/:id/assign-manual-rider', requireStaff, wrap(async (req, res) => {
  const { id } = req.params;
  const { name, phone, plateNumber, vehicleType, shift } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'Rider Name and Phone Number are required.' });
  }

  const result = await neonClient.assignManualRiderToOrder(id, { name, phone, plateNumber, vehicleType, shift });
  if (!result) return res.status(400).json({ error: 'Could not assign manual courier to order.' });

  // Broadcast to kitchen and admin (with PIN)
  io.to('role_admin').to('role_kitchen').emit('order_assigned_to_rider', result);
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', result.order);
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());

  // Customer gets safe update without PIN
  const { verificationPin, ...safeOrder } = result.order;
  io.to(`order_${id}`).emit('live_order_status', safeOrder);
  io.to(`order_${id}`).emit('order_status_updated', safeOrder);
  if (result.order.riderId) {
    io.to(`rider_${result.order.riderId}`).emit('order_assigned_to_rider', { order: safeOrder });
    io.to(`rider_${result.order.riderId}`).emit('order_status_updated', safeOrder);
  }

  return res.json(result);
}));

app.post('/api/orders/:id/reassign-rider', requireStaff, wrap(async (req, res) => {
  const result = await neonClient.reassignRider(req.params.id, req.body.newRiderId || null);
  if (result.order) {
    io.to('role_admin').to('role_kitchen').emit('order_status_updated', result.order);
    const { verificationPin, ...safeOrder } = result.order;
    io.to(`order_${result.order.id}`).emit('live_order_status', safeOrder);
    io.to(`order_${result.order.id}`).emit('order_status_updated', safeOrder);
    if (result.order.riderId) {
      io.to(`rider_${result.order.riderId}`).emit('order_assigned_to_rider', { order: safeOrder });
      io.to(`rider_${result.order.riderId}`).emit('order_status_updated', safeOrder);
    }
  }
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());
  return res.json(result);
}));

app.post('/api/orders/:id/handover-pickup', requireStaff, handoverLimiter, wrap(async (req, res) => {
  // Only the assigned courier may confirm pickup with customer PIN.
  let riderId = req.body.riderId;
  if (req.user.role === 'delivery') {
    const courier = await neonClient.findRiderForUser(req.user);
    riderId = courier ? courier.id : req.user.id;
  }
  const result = await neonClient.verifyHandover(req.params.id, req.body.verificationPin, {
    riderId
  });
  io.to('role_admin').to('role_kitchen').emit('order_handed_over_to_rider', { orderId: req.params.id, order: result });
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', result);
  io.to(`order_${result.id}`).emit('live_order_status', result);
  io.to(`order_${result.id}`).emit('order_status_updated', result);
  return res.json({ message: 'Handover confirmed.', order: result });
}));

app.post('/api/orders/:id/complete', requireStaff, wrap(async (req, res) => {
  let riderId = req.body.riderId;
  if (req.user.role === 'delivery') {
    const courier = await neonClient.findRiderForUser(req.user);
    riderId = courier ? courier.id : req.user.id;
  }
  const order = await neonClient.completeDelivery(req.params.id, riderId);
  io.to('role_admin').to('role_kitchen').emit('order_status_updated', order);
  io.to(`order_${order.id}`).emit('live_order_status', order);
  io.to(`order_${order.id}`).emit('order_status_updated', order);
  io.to('role_admin').to('role_kitchen').emit('rider_fleet_updated', await neonClient.getRiders());
  return res.json(order);
}));

app.post('/api/orders/:id/location', requireStaff, wrap(async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng must be numbers.' });
  }

  // Prevent spoofing: if delivery courier, verify assigned order
  if (req.user.role === 'delivery') {
    const targetOrder = await neonClient.getOrderById(req.params.id);
    const courier = await neonClient.findRiderForUser(req.user);
    const effectiveId = courier ? courier.id : req.user.id;
    if (!targetOrder || String(targetOrder.riderId) !== String(effectiveId)) {
      return res.status(403).json({ error: 'You are not assigned to this order.' });
    }
  }

  const payload = {
    orderId: req.params.id,
    lat,
    lng,
    speed: Number(req.body.speed) || 0,
    heading: Number(req.body.heading) || 0,
    distanceRemaining: Number(req.body.distanceRemaining) || null,
    eta: req.body.eta ?? null,
    timestamp: new Date().toISOString()
  };
  io.to(`order_${payload.orderId}`).emit('rider_location_broadcast', payload);
  io.to('role_admin').to('role_kitchen').emit('admin_rider_gps_updated', payload);
  return res.json({ success: true, telemetry: payload });
}));

// ===========================================================================
// Reviews
// ===========================================================================
app.post('/api/reviews', requireAuth, wrap(async (req, res) => {
  if (!req.body.orderId) return res.status(400).json({ error: 'orderId is required.' });
  // The rule "only a delivered order you actually own can be reviewed" lives in
  // the data layer, on the server. The userId is taken from the token.
  const review = await neonClient.createReview({
    orderId: req.body.orderId,
    userId: req.user.id,
    pizzaRating: req.body.pizzaRating,
    riderRating: req.body.riderRating,
    comment: req.body.comment
  });
  res.status(201).json({ success: true, review });
}));

app.get('/api/reviews', requireStaff, wrap(async (req, res) => {
  res.json(await neonClient.getReviews());
}));

// ===========================================================================
// Admin
// ===========================================================================
app.get('/api/admin/analytics', requireAdmin, wrap(async (req, res) => {
  const data = await neonClient.getAdminAnalytics();
  const riders = await neonClient.getRiders();
  res.json({
    ...data,
    ridersOnline: riders.filter((r) => r.status === 'available' || r.status === 'busy').length,
    ridersTotal: riders.length
  });
}));

app.get('/api/admin/users', requireAdmin, wrap(async (req, res) => {
  res.json(await neonClient.listUsers());
}));

app.patch('/api/admin/users/:id/role', requireAdmin, wrap(async (req, res) => {
  const user = await neonClient.setUserRole(req.params.id, req.body.role);
  io.to(`user_${req.params.id}`).emit('auth_role_changed', { userId: req.params.id, role: user.role });
  const userSockets = await io.in(`user_${req.params.id}`).fetchSockets();
  for (const s of userSockets) {
    s.disconnect(true);
  }
  res.json({ user: publicUser(user) });
}));

// ===========================================================================
// Realtime
// ===========================================================================
/** Verify a socket's token, check live role and token version against database, or reject outright. */
async function socketUser(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required.'));
  try {
    const decoded = jwt.verify(String(token), JWT_SECRET);
    if (decoded.id) {
      const liveUser = await neonClient.findUserById(decoded.id);
      if (!liveUser) return next(new Error('User account not found.'));
      const liveTokenVersion = Number(liveUser.token_version ?? liveUser.tokenVersion ?? 1);
      const tokenVersion = Number(decoded.tokenVersion ?? 1);
      if (tokenVersion < liveTokenVersion) {
        return next(new Error('Session has been revoked.'));
      }
      const liveRole = String(liveUser.role || 'customer').toLowerCase();
      if (decoded.role && String(decoded.role).toLowerCase() !== liveRole) {
        return next(new Error('Account permissions changed.'));
      }
      socket.data.user = { ...decoded, role: liveRole };
    } else {
      socket.data.user = decoded;
    }
    return next();
  } catch {
    return next(new Error('Invalid or expired token.'));
  }
}

io.use(socketUser);

io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.join(`role_${user.role}`);
  socket.join(`user_${user.id}`);

  if (user.role === 'delivery') {
    neonClient.findRiderForUser(user).then((courier) => {
      if (courier && courier.id) {
        socket.join(`rider_${courier.id}`);
      }
    }).catch(() => {});
  }

  socket.on('join_order_room', async (orderId) => {
    try {
      const order = await neonClient.getOrderById(orderId);
      if (!order) return;
      const isOwner = String(order.userId) === String(user.id);
      if (user.role === 'customer' && !isOwner) {
        console.warn(`[ws] User ${user.id} tried to watch order ${orderId} they do not own`);
        return;
      }
      if (user.role === 'delivery') {
        const courier = await neonClient.findRiderForUser(user);
        const riderIds = [courier?.id, user.id].filter(Boolean).map(String);
        const isAssigned =
          (order.riderId && riderIds.includes(String(order.riderId))) ||
          (!order.riderId && courier?.name && order.riderName === courier.name);
        if (!isAssigned) {
          console.warn(`[ws] Courier ${user.id} tried to watch order ${orderId} not assigned to them`);
          return;
        }
      }
      socket.join(`order_${orderId}`);
    } catch (err) {
      console.error('[ws] join_order_room failed:', err.message);
    }
  });

  socket.on('leave_order_room', (orderId) => socket.leave(`order_${orderId}`));

  // GPS telemetry is staff-only with anti-spoofing verification
  socket.on('stream_rider_gps', async (data) => {
    if (user.role === 'customer') return;
    const { orderId, lat, lng } = data || {};
    if (!orderId || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

    if (user.role === 'delivery') {
      try {
        const targetOrder = await neonClient.getOrderById(orderId);
        const courier = await neonClient.findRiderForUser(user);
        const effectiveId = courier ? courier.id : user.id;
        if (!targetOrder || String(targetOrder.riderId) !== String(effectiveId)) {
          return;
        }
      } catch {
        return;
      }
    }

    const payload = {
      orderId,
      lat: Number(lat),
      lng: Number(lng),
      speed: Number(data.speed) || 0,
      heading: Number(data.heading) || 0,
      distanceRemaining: Number(data.distanceRemaining) || null,
      eta: data.eta ?? null,
      timestamp: new Date().toISOString()
    };
    io.to(`order_${orderId}`).emit('rider_location_broadcast', payload);
    io.to('role_admin').to('role_kitchen').emit('admin_rider_gps_updated', payload);
  });

  socket.on('disconnect', () => {});
});

// ===========================================================================
// Error handling — must be registered last, and must have all four params.
// Express 5 forwards rejected promises here automatically for async handlers,
// and `wrap` does it explicitly for anything else.
// ===========================================================================
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error('[api]', req.method, req.originalUrl, err);
  res.status(status).json({
    // 5xx messages are deliberately generic; 4xx messages are written for the
    // person using the app and are safe to show.
    error: status >= 500 ? 'Something went wrong on our end. Please try again.' : err.message
  });
});

const PORT = Number(process.env.PORT) || 5002;

async function start() {
  neonClient.assertDatabaseConfigured();
  await neonClient.bootstrap();
  server.listen(PORT, () => {
    console.log(`HotPot API listening on :${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[fatal] Server failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.io = io;
module.exports.start = start;
