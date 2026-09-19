// Comprehensive Database Abstraction & Store Layer
const bcrypt = require('bcryptjs');

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
    totalRWF: 22000,
    status: 'pending',
    riderName: 'Eric Mugisha',
    paymentMethod: 'MTN Mobile Money',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString()
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

module.exports = {
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
  getOrders: () => orders,
  createOrder: (data) => {
    const newOrder = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'pending',
      paymentStatus: 'PAID',
      createdAt: new Date().toISOString(),
      ...data
    };
    orders.unshift(newOrder);
    return newOrder;
  },
  updateOrderStatus: (id, status, riderName) => {
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    orders[idx].status = status;
    if (riderName) orders[idx].riderName = riderName;
    return orders[idx];
  },
  cancelOrder: (id) => {
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    
    // Check 120-second grace period
    const elapsedSeconds = (Date.now() - new Date(orders[idx].createdAt).getTime()) / 1000;
    if (elapsedSeconds > 120) {
      return { error: 'Grace period expired. Order cannot be cancelled after 2 minutes.' };
    }
    orders[idx].status = 'cancelled';
    return orders[idx];
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
