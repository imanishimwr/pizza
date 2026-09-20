// Comprehensive Database Abstraction & Store Layer
const bcrypt = require('bcryptjs');
const orderFlow = require('./orderFlow');

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '—';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
}

let users = [
  {
    id: 'user-admin-01',
    name: 'Executive Admin',
    email: 'admin@hotpotdelights.rw',
    phone: '0788000001',
    passwordHash: '$2a$10$wT.9nK/Wb8j3X3h3H3H3H.k3H3H3H3H3H3H3H3H3H3H3H3H3H3H3H',
    role: 'ADMIN'
  }
];

let meals = [
  {
    id: 'hp-01',
    name: 'Royal Szechuan Hotpot Combo',
    category: 'hotpot',
    price: 22000,
    rating: 4.9,
    reviews: 142,
    description: 'Signature spicy Szechuan broth served with prime sliced beef, fresh napa cabbage, shiitake mushrooms, tofu, and hand-pulled noodles.',
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
    reviews: 98,
    description: 'Fresh mozzarella, smoked BBQ chicken, wild mushrooms, oregano, and garlic infused olive oil crust.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    spicy: false,
    outOfStock: false
  },
  {
    id: 'hp-03',
    name: 'Kigali Supreme Hotpot Feast',
    category: 'hotpot',
    price: 28000,
    rating: 5.0,
    reviews: 210,
    description: 'Double flavor split hotpot bowl featuring half Szechuan Fire and half Rich Bone Marrow Broth.',
    image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
    spicy: true,
    outOfStock: false
  }
];

let orders = [
  {
    id: '104829',
    customerName: 'Aline Uwase',
    phone: '0788123456',
    address: 'KG 9 Ave, Nyarutarama, Kigali',
    totalRWF: 29000,
    status: 'pending',
    riderName: null,
    paymentType: 'MTN Mobile Money',
    paymentStatus: 'PAID',
    items: [
      { id: 'oi-1', name: 'Royal Szechuan Hotpot Combo', qty: 1, price: 22000, spice: 'Medium Szechuan 🌶️🌶️', broth: 'Szechuan Chili Oil', specialNote: '' },
      { id: 'oi-2', name: 'Iced Passionfruit Jasmine Tea', qty: 2, price: 3500, spice: null, broth: null, specialNote: '' }
    ],
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    preparedAt: null,
    readyAt: null,
    deliveredAt: null
  }
];

let vouchers = [
  { code: 'BOGOPIZZA', discountPercent: 20, description: '20% Off Gourmet Pizzas', active: true },
  { code: 'KIGALIFREE', discountAmount: 3000, description: '3000 RWF Off Delivery Fee', active: true },
  { code: 'HOTPOT25', discountPercent: 25, description: '25% Off Szechuan Combos', active: true }
];

let feedbackList = [];

let riderLocations = {
  'Eric Mugisha': { lat: -1.9702, lng: 30.1250, status: 'AVAILABLE', vehicle: 'RAC 482B' },
  'Jean-Paul Nshimiyimana': { lat: -1.9510, lng: 30.0920, status: 'DELIVERING', vehicle: 'RD 192A' },
  'Patrick Habimana': { lat: -1.9620, lng: 30.1100, status: 'AVAILABLE', vehicle: 'RAE 883K' }
};

const store = {
  // User Model Queries
  findUserByEmail: (email) => users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  createUser: async ({ name, email, phone, password, role = 'CUSTOMER' }) => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = { id: `user-${Date.now()}`, name, email, phone, passwordHash, role };
    users.push(newUser);
    return newUser;
  },

  // Meal Model Queries
  getMeals: ({ category, search, spicy }) => {
    let res = meals;
    if (category && category !== 'all') res = res.filter(m => m.category === category);
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }
    if (spicy !== undefined) {
      res = res.filter(m => m.spicy === (spicy === 'true'));
    }
    return res;
  },
  createMeal: (data) => {
    const newMeal = { id: `hp-${Date.now()}`, rating: 5.0, reviews: 1, outOfStock: false, ...data };
    meals.push(newMeal);
    return newMeal;
  },
  updateMeal: (id, data) => {
    const idx = meals.findIndex(m => m.id === id);
    if (idx === -1) return null;
    meals[idx] = { ...meals[idx], ...data };
    return meals[idx];
  },

  // Order Model Queries
  serializeOrder: (o) => ({
    id: o.id,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    lat: o.lat || null,
    lng: o.lng || null,
    status: String(o.status || 'pending').toLowerCase(),
    totalRWF: Number(o.totalRWF) || 0,
    riderName: o.riderName || null,
    paymentMethod: o.paymentType || 'MTN Mobile Money',
    paymentStatus: o.paymentStatus || 'PAID',
    userId: o.userId || null,
    createdAt: o.createdAt || o.created_at || null,
    preparedAt: o.preparedAt || null,
    readyAt: o.readyAt || null,
    deliveredAt: o.deliveredAt || null,
    orderTime: formatTime(o.createdAt || o.created_at),
    items: Array.isArray(o.items) ? o.items.map((it) => ({ id: it.id || null, name: it.name, qty: Number(it.qty) || 1, price: Number(it.price) || 0, mealId: it.mealId || null, spice: it.spice || undefined, broth: it.broth || undefined, specialNote: it.specialNote || undefined })) : []
  }),

  getOrders: () => orders.map((o) => store.serializeOrder(o)),

  getOrderById: (id) => {
    const found = orders.find((o) => String(o.id) === String(id));
    return found ? store.serializeOrder(found) : null;
  },

  getKitchenBoard: () => store.getOrders().filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)),

  getKitchenStats: () => {
    const groups = { pending: 0, preparing: 0, ready: 0, delivery: 0, delivered: 0 };
    orders.forEach((o) => { const s = String(o.status).toLowerCase(); if (s in groups) groups[s] += 1; });
    const prepTimes = orders
      .filter((o) => o.readyAt && o.preparedAt)
      .map((o) => (new Date(o.readyAt).getTime() - new Date(o.preparedAt).getTime()) / 1000);
    const avgPrepSeconds = prepTimes.length
      ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
      : null;
    return {
      ...groups,
      avgPrepSeconds,
      avgPrepMinutes: avgPrepSeconds ? Math.round((avgPrepSeconds / 60) * 10) / 10 : null
    };
  },

  createOrder: (data) => {
    const newOrder = {
      id: `HP-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending',
      paymentType: data.paymentMethod || 'MTN Mobile Money',
      paymentStatus: 'PAID',
      items: Array.isArray(data.items) ? data.items.map((it, i) => ({ id: `oi-${Date.now()}-${i}`, ...it })) : [],
      createdAt: new Date().toISOString(),
      preparedAt: null,
      readyAt: null,
      deliveredAt: null,
      ...data,
      totalRWF: Number(data.totalRWF) ||
        (Array.isArray(data.items) ? data.items.reduce((sum, it) => sum + (Number(it.qty) || 1) * (Number(it.price) || 0), 0) : 0)
    };
    orders.unshift(newOrder);
    return store.serializeOrder(newOrder);
  },

  updateOrderStatus: (id, status, riderName, role) => {
    const idx = orders.findIndex((o) => String(o.id) === String(id));
    if (idx === -1) return null;

    const currentStatus = String(orders[idx].status).toLowerCase();
    if (!orderFlow.canTransition(currentStatus, status, role)) {
      const err = new Error(`Invalid status transition: "${currentStatus}" -> "${status}"`);
      err.statusCode = 400;
      throw err;
    }

    orders[idx].status = String(status).toLowerCase();
    if (riderName) orders[idx].riderName = riderName;
    const now = new Date().toISOString();
    if (String(status).toLowerCase() === 'preparing' && !orders[idx].preparedAt) orders[idx].preparedAt = now;
    if (String(status).toLowerCase() === 'ready') orders[idx].readyAt = now;
    if (String(status).toLowerCase() === 'delivered') orders[idx].deliveredAt = now;
    return store.serializeOrder(orders[idx]);
  },

  cancelOrder: (id) => {
    const idx = orders.findIndex(o => String(o.id) === String(id));
    if (idx === -1) return null;

    // Check 120-second grace period
    const elapsedSeconds = (Date.now() - new Date(orders[idx].createdAt).getTime()) / 1000;
    if (elapsedSeconds > 120) {
      return { error: 'Grace period expired. Order cannot be cancelled after 2 minutes.' };
    }
    orders[idx].status = 'cancelled';
    return store.serializeOrder(orders[idx]);
  },

  // Voucher Verification Query
  validateVoucher: (code) => {
    const voucher = vouchers.find(v => v.code.toUpperCase() === code.toUpperCase() && v.active);
    return voucher || null;
  },

  // Feedback & Tipping Handler
  addFeedback: (orderId, rating, comment, tipRWF) => {
    const feedback = {
      id: `fb-${Date.now()}`,
      orderId,
      rating,
      comment,
      tipRWF: tipRWF || 0,
      createdAt: new Date().toISOString()
    };
    feedbackList.push(feedback);
    return feedback;
  },

  // Rider Fleet GPS Monitor Query
  getRiderLocations: () => riderLocations,
  updateRiderGps: (riderName, lat, lng) => {
    if (riderLocations[riderName]) {
      riderLocations[riderName].lat = lat;
      riderLocations[riderName].lng = lng;
    }
    return riderLocations[riderName];
  }
};

module.exports = store;