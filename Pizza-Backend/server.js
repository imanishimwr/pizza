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
require('dotenv').config();

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

const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
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

app.use('/api/', readLimiter);
app.use(/^(POST|PATCH|PUT|DELETE)$/, writeLimiter);

const STAFF = ['admin', 'kitchen', 'delivery'];
const requireAuth = authMiddleware();
const requireAdmin = authMiddleware(['admin']);
const requireStaff = authMiddleware(STAFF);

/** Wrap an async handler so a rejection reaches the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: '7d'
  });

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

  console.log(`[auth] Register attempt for email: "${email}" (name: "${name}")`);

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
      console.warn(`[auth] Registration conflict: email "${email}" is already registered.`);
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }

    // `role` is intentionally NOT read from the body. Self-registration can only
    // ever create a customer; staff accounts are provisioned by seed or promoted
    // by an authenticated admin via PATCH /api/admin/users/:id/role.
    const user = await neonClient.registerUser({ name, email, phone, password });
    console.log(`[auth] Registration success for user id: ${user.id} (${user.email}, role: ${user.role})`);
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(`[auth] Database error during registration for ${email}:`, err);
    return res.status(500).json({ error: err.message || 'Database error occurred during registration. Please try again.' });
  }
}));

app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  console.log(`[auth] Login attempt for email: "${email}"`);

  if (!email) {
    return res.status(400).json({ error: 'Please enter your email address.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Please enter your password.' });
  }

  try {
    const user = await neonClient.verifyLogin(email, password);
    if (!user) {
      console.warn(`[auth] Login failed: invalid credentials for email "${email}"`);
      return res.status(401).json({ error: 'Invalid email address or password. Please verify your credentials.' });
    }
    console.log(`[auth] Login success for user: ${user.email} (id: ${user.id}, role: ${user.role})`);
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(`[auth] Authentication error for ${email}:`, err);
    return res.status(500).json({ error: err.message || 'Authentication service error. Please try again.' });
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
  return res.json(await neonClient.getOrders({ statuses, limit }));
}));

app.get('/api/orders/:id', requireAuth, wrap(async (req, res) => {
  const order = await neonClient.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const isOwner = String(order.userId) === String(req.user.id);
  if (req.user.role === 'customer' && !isOwner) {
    return res.status(403).json({ error: 'You can only view your own orders.' });
  }
  if (pinVisibilityFor(req, order)) {
    return res.json({ ...order, verificationPin: order.verificationPin || null });
  }
  return res.json(order);
}));

app.post('/api/orders', requireAuth, wrap(async (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  // A customer may only place an order under their own name and phone number.
  // Staff placing an order on someone's behalf is allowed, but only for staff.
  const customerName = req.user.role === 'customer' ? req.user.name : String(body.customerName || req.user.name).trim();
  const phone = req.user.role === 'customer' ? (req.user.phone || body.phone) : body.phone;
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
    address
  });
  io.emit('new_order_placed', order);
  return res.status(201).json(order);
}));

app.patch('/api/orders/:id/status', requireStaff, wrap(async (req, res) => {
  const order = await neonClient.updateOrderStatus(req.params.id, req.body.status, {
    riderName: req.body.riderName
  });
  io.emit('order_status_updated', order);
  io.to(`order_${order.id}`).emit('live_order_status', order);
  if (order.status === 'delivered') {
    io.emit('rider_fleet_updated', await neonClient.getRiders());
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
    return res.status(403).json({ error: 'You can only cancel your own orders.' });
  }

  const order = await neonClient.cancelOrder(req.params.id);
  io.emit('order_cancelled', order);
  io.emit('order_status_updated', order);
  io.to(`order_${order.id}`).emit('live_order_status', order);
  return res.json({ message: 'Order cancelled.', order });
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
  io.emit('order_status_updated', order);
  return res.json(order);
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
  io.emit('rider_fleet_updated', await neonClient.getRiders());
  res.status(201).json(rider);
}));

app.patch('/api/riders/:id', requireAdmin, wrap(async (req, res) => {
  const rider = await neonClient.updateRider(req.params.id, req.body);
  if (!rider) return res.status(404).json({ error: 'Rider not found.' });
  io.emit('rider_fleet_updated', await neonClient.getRiders());
  res.json(rider);
}));

app.patch('/api/riders/:id/availability', requireStaff, wrap(async (req, res) => {
  // A rider may only change their own duty status.
  if (req.user.role === 'delivery' && String(req.user.id) !== String(req.params.id)) {
    return res.status(403).json({ error: 'You can only change your own availability.' });
  }
  const rider = await neonClient.setRiderAvailability(req.params.id, req.body.is_available);
  io.emit('rider_availability_updated', rider);
  io.emit('rider_fleet_updated', await neonClient.getRiders());
  res.json(rider);
}));

app.get('/api/riders/live-gps', requireStaff, wrap(async (req, res) => {
  res.json(await neonClient.getRiderLocations());
}));

app.post('/api/orders/:id/assign-rider', requireStaff, wrap(async (req, res) => {
  if (!req.body.riderId) return res.status(400).json({ error: 'riderId is required.' });
  const result = await neonClient.assignRider(req.params.id, req.body.riderId);

  io.emit('order_assigned_to_rider', result);
  io.emit('order_status_updated', result.order);
  io.to(`order_${result.order.id}`).emit('live_order_status', result.order);
  io.emit('rider_fleet_updated', await neonClient.getRiders());
  return res.json(result);
}));

// Smart Dispatch: Assign Manual / Custom Courier to Order
app.post('/api/orders/:id/assign-manual-rider', wrap(async (req, res) => {
  const { id } = req.params;
  const { name, phone, plateNumber, vehicleType, verificationPin, shift } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Rider Name and Phone Number are required.' });
  }

  const result = db.assignManualRiderToOrder
    ? db.assignManualRiderToOrder(id, { name, phone, plateNumber, vehicleType, verificationPin, shift })
    : null;
  if (!result) return res.status(400).json({ error: 'Could not assign manual courier to order.' });

  // Broadcast to kitchen, admin, and customer
  io.emit('order_assigned_to_rider', result);
  io.emit('order_status_updated', result.order);
  io.emit('rider_fleet_updated', db.getRiders ? db.getRiders() : await neonClient.getRiders());
  io.to(`order_${id}`).emit('live_order_status', result.order);

  return res.json(result);
}));

app.post('/api/orders/:id/reassign-rider', requireStaff, wrap(async (req, res) => {
  const result = await neonClient.reassignRider(req.params.id, req.body.newRiderId || null);
  if (result.order) {
    io.emit('order_status_updated', result.order);
    io.to(`order_${result.order.id}`).emit('live_order_status', result.order);
  }
  io.emit('rider_fleet_updated', await neonClient.getRiders());
  return res.json(result);
}));

app.post('/api/orders/:id/handover-pickup', requireStaff, wrap(async (req, res) => {
  // Only the assigned courier may confirm pickup, and only with the code the
  // customer gave them. A blank code is a failure, not a bypass.
  const result = await neonClient.verifyHandover(req.params.id, req.body.verificationPin, {
    riderId: req.body.riderId
  });
  io.emit('order_handed_over_to_rider', { orderId: req.params.id, order: result });
  io.emit('order_status_updated', result);
  io.to(`order_${result.id}`).emit('live_order_status', result);
  return res.json({ message: 'Handover confirmed.', order: result });
}));

app.post('/api/orders/:id/complete', requireStaff, wrap(async (req, res) => {
  const riderId = req.body.riderId || (req.user.role === 'delivery' ? req.user.id : null);
  const order = await neonClient.completeDelivery(req.params.id, riderId);
  io.emit('order_status_updated', order);
  io.to(`order_${order.id}`).emit('live_order_status', order);
  io.emit('rider_fleet_updated', await neonClient.getRiders());
  return res.json(order);
}));

app.post('/api/orders/:id/location', requireStaff, wrap(async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng must be numbers.' });
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
  io.emit('admin_rider_gps_updated', payload);
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
  res.json({ user });
}));

// ===========================================================================
// Realtime
// ===========================================================================
/** Verify a socket's token, or reject the connection outright. */
function socketUser(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required.'));
  try {
    socket.data.user = jwt.verify(String(token), JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Invalid or expired token.'));
  }
}

io.use(socketUser);

io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.join(`role_${user.role}`);

  socket.on('join_order_room', async (orderId) => {
    try {
      const order = await neonClient.getOrderById(orderId);
      if (!order) return;
      const isOwner = String(order.userId) === String(user.id);
      if (user.role === 'customer' && !isOwner) {
        console.warn(`[ws] ${user.email} tried to watch order ${orderId} they do not own`);
        return;
      }
      socket.join(`order_${orderId}`);
    } catch (err) {
      console.error('[ws] join_order_room failed:', err.message);
    }
  });

  socket.on('leave_order_room', (orderId) => socket.leave(`order_${orderId}`));

  // GPS telemetry is staff-only. Previously any anonymous socket could rebroadcast
  // any other socket's payload verbatim.
  socket.on('stream_rider_gps', (data) => {
    if (user.role === 'customer') return;
    const { orderId, lat, lng } = data || {};
    if (!orderId || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
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
    io.emit('admin_rider_gps_updated', payload);
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

module.exports = { app, server, io, start };
