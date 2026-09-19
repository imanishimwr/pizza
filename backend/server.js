// HotPot Delights & Pizza Node.js Express REST + WebSocket Server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// In-Memory Data Store (Failsafe fallback before Prisma/PostgreSQL migration)
let meals = [
  {
    id: 'hp-01',
    name: 'Royal Szechuan Hotpot Combo',
    category: 'hotpot',
    price: 22000,
    rating: 4.9,
    description: 'Signature spicy Szechuan broth served with prime sliced beef, fresh napa cabbage, shiitake mushrooms, and noodles.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    spicy: true,
    outOfStock: false
  },
  {
    id: 'hp-02',
    name: 'BBQ Chicken & Mushroom Pizza',
    category: 'pizzas',
    price: 14500,
    rating: 4.8,
    description: 'Fresh mozzarella, smoked BBQ chicken, wild mushrooms, oregano, and garlic infused olive oil crust.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    spicy: false,
    outOfStock: false
  }
];

let orders = [];

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'HotPot Delights Kigali API', timestamp: new Date() });
});

// Meals API Endpoints
app.get('/api/meals', (req, res) => {
  const { category, search } = req.query;
  let result = meals;

  if (category && category !== 'all') {
    result = result.filter(m => m.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }

  res.json(result);
});

app.post('/api/meals', (req, res) => {
  const newMeal = { id: `hp-${Date.now()}`, ...req.body };
  meals.push(newMeal);
  io.emit('meal_updated', meals);
  res.status(201).json(newMeal);
});

// Orders API Endpoints
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const newOrder = {
    id: Math.floor(100000 + Math.random() * 900000).toString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...req.body
  };
  orders.unshift(newOrder);
  io.emit('new_order', newOrder);
  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, riderName } = req.body;

  const orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  orders[orderIndex].status = status;
  if (riderName) orders[orderIndex].riderName = riderName;

  io.emit('order_status_changed', orders[orderIndex]);
  res.json(orders[orderIndex]);
});

// WebSocket Event Connection
io.on('connection', (socket) => {
  console.log(`🔌 Client Connected to HotPot WebSocket: ${socket.id}`);

  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  socket.on('update_rider_location', ({ orderId, lat, lng }) => {
    io.to(`order_${orderId}`).emit('rider_location_updated', { orderId, lat, lng });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 HotPot Delights API Server running on port ${PORT}`);
});
