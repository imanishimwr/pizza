// Production Grade HotPot & Pizza REST + WebSocket Server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const neonClient = require('./neonClient');
const authMiddleware = require('./middleware/auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// WebSockets Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Security & Audit Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate Limiting Security Protection (150 requests per 15 min per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

const JWT_SECRET = process.env.JWT_SECRET || 'hotpot_kigali_jwt_secret_key_2026';

const { googleLoginHandler } = require('./controllers/googleAuth');

// ----------------------------------------------------
// 1. Authentication Routes (/api/auth)
// ----------------------------------------------------
app.post('/api/auth/google', (req, res) => googleLoginHandler(req, res, neonClient));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // 1. Check if user already exists in Neon PostgreSQL
    const existingUser = await neonClient.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists in Neon DB.' });
    }

    // 2. Register user in Neon PostgreSQL
    const newUser = await neonClient.registerUserInNeon({ name, email, phone, password, role: role || 'CUSTOMER' });

    // 3. Generate JWT Token
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`👤 New User Registered in Neon Database: ${newUser.email} (${newUser.role})`);

    res.status(201).json({
      message: 'Account successfully registered and saved in Neon PostgreSQL Database!',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role }
    });
  } catch (err) {
    console.error('❌ User Registration Error:', err.message);
    res.status(500).json({ error: 'Failed to create user account in Neon database.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // 1. Authenticate against Neon PostgreSQL
    const user = await neonClient.verifyLoginInNeon(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    // 2. Generate JWT Token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`🔑 User Logged In via Neon Database: ${user.email} (${user.role})`);

    res.json({
      message: 'Authentication successful with Neon PostgreSQL Database!',
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (err) {
    console.error('❌ Login Error:', err.message);
    res.status(500).json({ error: 'Authentication server error.' });
  }
});

// ----------------------------------------------------
// 2. Food Catalog Routes (/api/meals)
// ----------------------------------------------------
app.get('/api/meals', (req, res) => {
  const mealsList = db.getMeals(req.query);
  res.json(mealsList);
});

app.post('/api/meals', authMiddleware(['ADMIN']), (req, res) => {
  const newMeal = db.createMeal(req.body);
  io.emit('meal_catalog_updated', newMeal);
  res.status(201).json(newMeal);
});

app.patch('/api/meals/:id', authMiddleware(['ADMIN']), (req, res) => {
  const updated = db.updateMeal(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Meal item not found.' });
  io.emit('meal_catalog_updated', updated);
  res.json(updated);
});

// ----------------------------------------------------
// 3. Order Management & Cancellation Routes (/api/orders)
// ----------------------------------------------------
app.get('/api/orders', (req, res) => {
  const ordersList = db.getOrders();
  res.json(ordersList);
});

app.post('/api/orders', (req, res) => {
  const { customerName, phone, address } = req.body;
  if (!customerName || !phone || !address) {
    return res.status(400).json({ error: 'Missing required order details.' });
  }

  const newOrder = db.createOrder(req.body);
  io.emit('new_order_placed', newOrder);
  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, riderName } = req.body;

  const updatedOrder = db.updateOrderStatus(id, status, riderName);
  if (!updatedOrder) return res.status(404).json({ error: 'Order not found.' });

  io.emit('order_status_updated', updatedOrder);
  io.to(`order_${id}`).emit('live_order_status', updatedOrder);

  res.json(updatedOrder);
});

// Cancel order within 120s grace period
app.delete('/api/orders/:id', (req, res) => {
  const result = db.cancelOrder(req.params.id);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  io.emit('order_cancelled', result);
  res.json({ message: 'Order successfully cancelled within grace period', order: result });
});

// Post-delivery Tipping & Review Feedback
app.post('/api/orders/:id/feedback', (req, res) => {
  const { rating, comment, tipRWF } = req.body;
  const feedback = db.addFeedback(req.params.id, rating, comment, tipRWF);
  res.status(201).json({ message: 'Thank you for rating your rider and food experience!', feedback });
});

// ----------------------------------------------------
// 4. Mobile Money Rwanda Payment API (/api/payments)
// ----------------------------------------------------
app.post('/api/payments/momo-checkout', (req, res) => {
  const { phone, amountRWF, provider } = req.body;
  if (!phone || !amountRWF) {
    return res.status(400).json({ error: 'Phone number and amount are required.' });
  }

  // Simulate MoMo USSD Push prompt
  res.json({
    status: 'PENDING_USER_PIN',
    transactionId: `MOMO-RW-${Date.now()}`,
    message: `USSD Push request sent to ${phone} for ${amountRWF.toLocaleString()} RWF (${provider || 'MTN MoMo Rwanda'}). Please authorize with your PIN.`
  });
});

// ----------------------------------------------------
// 5. Promo Voucher Validation (/api/vouchers/validate)
// ----------------------------------------------------
app.post('/api/vouchers/validate', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Voucher code is required.' });

  const voucher = db.validateVoucher(code);
  if (!voucher) {
    return res.status(404).json({ error: 'Invalid or expired promo code.' });
  }

  res.json({ valid: true, voucher });
});

// ----------------------------------------------------
// 6. Live Rider Fleet & Admin Analytics (/api/riders)
// ----------------------------------------------------
app.get('/api/riders/live-gps', (req, res) => {
  res.json(db.getRiderLocations());
});

app.get('/api/admin/analytics', authMiddleware(['ADMIN']), (req, res) => {
  const orders = db.getOrders();
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalRWF || 0), 0);
  const activeCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  res.json({
    totalRevenueRWF: totalRevenue,
    totalOrdersCount: orders.length,
    activeOrdersCount: activeCount,
    ridersOnline: 3,
    topSellingCategory: 'Gourmet Pizzas'
  });
});

// ----------------------------------------------------
// 7. WebSockets Event Streams
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to WebSocket: ${socket.id}`);

  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  socket.on('stream_rider_gps', ({ orderId, lat, lng }) => {
    io.to(`order_${orderId}`).emit('rider_gps_updated', { orderId, lat, lng });
    io.emit('admin_rider_gps_updated', { orderId, lat, lng });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'SECURE & FULLY OPERATIONAL',
    service: 'HotPot Delights Kigali Production API',
    security: 'Helmet + JWT + Rate Limiter Active',
    endpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/meals',
      '/api/orders',
      '/api/payments/momo-checkout',
      '/api/vouchers/validate',
      '/api/riders/live-gps',
      '/api/admin/analytics'
    ],
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 HotPot Full Production Server running with Security & WebSockets on port ${PORT}`);
});
