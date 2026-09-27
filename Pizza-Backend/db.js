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
    status: 'ready',
    assigned_rider_id: 'rider-1',
    riderName: 'Eric Mugisha',
    riderPhone: '+250 788 123 456',
    riderPlate: 'RAC 402B',
    rider_handover_status: 'assigned',
    verification_pin: '4829',
    assigned_at: new Date(Date.now() - 2 * 60000).toISOString(),
    paymentMethod: 'MTN Mobile Money',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    items: [
      { name: 'Royal Szechuan Hotpot Combo', qty: 1, price: 22000 }
    ]
  }
];

let vouchers = [
  { code: 'BOGOPIZZA', discountPercent: 20, description: '20% Off Gourmet Pizzas', active: true },
  { code: 'KIGALIFREE', discountAmount: 3000, description: '3000 RWF Off Delivery Fee', active: true },
  { code: 'HOTPOT25', discountPercent: 25, description: '25% Off Szechuan Combos', active: true }
];

let feedbackList = [];

let riders = [
  {
    id: 'rider-1',
    name: 'Eric Mugisha',
    phone: '+250 788 123 456',
    plateNumber: 'RAC 402B',
    vehicleType: 'Yamaha XTZ 125 (Moto #1)',
    shift: 'Day Shift (08:00 - 16:00)',
    is_available: false,
    status: 'BUSY',
    current_order_id: '104829',
    lat: -1.9702,
    lng: 30.1250,
    rating: 4.95,
    completed_today: 8,
    earnings_today: 18500
  },
  {
    id: 'rider-2',
    name: 'Jean-Paul Nshimiyimana',
    phone: '+250 788 234 567',
    plateNumber: 'RD 192A',
    vehicleType: 'TVS Apache 160 (Moto #2)',
    shift: 'Day Shift (08:00 - 16:00)',
    is_available: true,
    status: 'AVAILABLE',
    current_order_id: null,
    lat: -1.9510,
    lng: 30.0920,
    rating: 4.88,
    completed_today: 6,
    earnings_today: 15200
  },
  {
    id: 'rider-3',
    name: 'Patrick Habimana',
    phone: '+250 788 345 678',
    plateNumber: 'RAE 883K',
    vehicleType: 'Honda Ace 125 (Moto #3)',
    shift: 'Evening Shift (16:00 - 00:00)',
    is_available: true,
    status: 'AVAILABLE',
    current_order_id: null,
    lat: -1.9620,
    lng: 30.1100,
    rating: 4.92,
    completed_today: 4,
    earnings_today: 12000
  },
  {
    id: 'rider-4',
    name: 'Fabrice Manzi',
    phone: '+250 788 456 789',
    plateNumber: 'RAG 311P',
    vehicleType: 'Bajaj Boxer 150 (Moto #4)',
    shift: 'Night Shift (18:00 - 02:00)',
    is_available: false,
    status: 'OFF_DUTY',
    current_order_id: null,
    lat: -1.9420,
    lng: 30.0750,
    rating: 4.85,
    completed_today: 0,
    earnings_today: 0
  }
];

let riderLocations = {
  'Eric Mugisha': { lat: -1.9702, lng: 30.1250, status: 'BUSY', vehicle: 'RAC 402B' },
  'Jean-Paul Nshimiyimana': { lat: -1.9510, lng: 30.0920, status: 'AVAILABLE', vehicle: 'RD 192A' },
  'Patrick Habimana': { lat: -1.9620, lng: 30.1100, status: 'AVAILABLE', vehicle: 'RAE 883K' },
  'Fabrice Manzi': { lat: -1.9420, lng: 30.0750, status: 'OFF_DUTY', vehicle: 'RAG 311P' }
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
      assigned_rider_id: null,
      riderName: null,
      riderPhone: null,
      riderPlate: null,
      rider_handover_status: 'unassigned',
      verification_pin: null,
      assigned_at: null,
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

    // Handle rider status changes on delivery completion
    if (status === 'delivered') {
      orders[idx].rider_handover_status = 'delivered';
      const riderId = orders[idx].assigned_rider_id;
      if (riderId) {
        const rIdx = riders.findIndex(r => r.id === riderId || r.name === riderName);
        if (rIdx !== -1) {
          riders[rIdx].status = 'AVAILABLE';
          riders[rIdx].is_available = true;
          riders[rIdx].current_order_id = null;
          riders[rIdx].completed_today = (riders[rIdx].completed_today || 0) + 1;
          riders[rIdx].earnings_today = (riders[rIdx].earnings_today || 18500) + 1200;
        }
      }
    }
    return orders[idx];
  },

  // Rider Fleet Management
  getRiders: () => riders,
  createRider: (riderData) => {
    const newRider = {
      id: `rider-${Date.now()}`,
      name: riderData.name,
      phone: riderData.phone || '+250 788 000 000',
      plateNumber: riderData.plateNumber || 'RAC 000X',
      vehicleType: riderData.vehicleType || 'Motorcycle 125cc',
      shift: riderData.shift || 'Day Shift (08:00 - 16:00)',
      is_available: true,
      status: 'AVAILABLE',
      current_order_id: null,
      lat: -1.9702,
      lng: 30.1250,
      rating: 5.0,
      completed_today: 0,
      earnings_today: 0
    };
    riders.push(newRider);
    riderLocations[newRider.name] = { lat: newRider.lat, lng: newRider.lng, status: 'AVAILABLE', vehicle: newRider.plateNumber };
    return newRider;
  },
  toggleRiderAvailability: (id, is_available) => {
    const rIdx = riders.findIndex(r => r.id === id);
    if (rIdx === -1) return null;
    riders[rIdx].is_available = !!is_available;
    riders[rIdx].status = is_available ? (riders[rIdx].current_order_id ? 'BUSY' : 'AVAILABLE') : 'OFF_DUTY';
    if (riderLocations[riders[rIdx].name]) {
      riderLocations[riders[rIdx].name].status = riders[rIdx].status;
    }
    return riders[rIdx];
  },
  updateRider: (id, data) => {
    const rIdx = riders.findIndex(r => r.id === id);
    if (rIdx === -1) return null;
    riders[rIdx] = { ...riders[rIdx], ...data };
    return riders[rIdx];
  },

  // Smart Dispatch & Handover Queries
  assignRiderToOrder: (orderId, riderId) => {
    const oIdx = orders.findIndex(o => o.id === orderId);
    const rIdx = riders.findIndex(r => r.id === riderId);
    if (oIdx === -1 || rIdx === -1) return null;

    const rider = riders[rIdx];
    const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    orders[oIdx].assigned_rider_id = rider.id;
    orders[oIdx].riderName = rider.name;
    orders[oIdx].riderPhone = rider.phone;
    orders[oIdx].riderPlate = rider.plateNumber;
    orders[oIdx].rider_handover_status = 'assigned';
    orders[oIdx].verification_pin = pin;
    orders[oIdx].assigned_at = new Date().toISOString();
    orders[oIdx].status = 'ready'; // Ready for courier pickup

    // Mark rider busy
    riders[rIdx].is_available = false;
    riders[rIdx].status = 'BUSY';
    riders[rIdx].current_order_id = orderId;
    if (riderLocations[rider.name]) {
      riderLocations[rider.name].status = 'BUSY';
    }

    return { order: orders[oIdx], rider: riders[rIdx], verificationPin: pin };
  },

  verifyHandoverPickup: (orderId, enteredPin) => {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if (oIdx === -1) return { error: 'Order not found.' };

    const order = orders[oIdx];
    if (enteredPin && order.verification_pin && order.verification_pin !== enteredPin.toString().trim()) {
      return { error: `Invalid 4-digit PIN. Expected: ${order.verification_pin}` };
    }

    order.rider_handover_status = 'in_transit';
    order.status = 'delivery';
    order.handed_over_at = new Date().toISOString();

    const riderId = order.assigned_rider_id;
    if (riderId) {
      const rIdx = riders.findIndex(r => r.id === riderId);
      if (rIdx !== -1) {
        riders[rIdx].status = 'BUSY';
      }
    }

    return { success: true, order };
  },

  reassignRider: (orderId, newRiderId) => {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if (oIdx === -1) return null;

    const oldRiderId = orders[oIdx].assigned_rider_id;
    if (oldRiderId) {
      const oldRIdx = riders.findIndex(r => r.id === oldRiderId);
      if (oldRIdx !== -1) {
        riders[oldRIdx].is_available = true;
        riders[oldRIdx].status = 'AVAILABLE';
        riders[oldRIdx].current_order_id = null;
      }
    }

    if (newRiderId) {
      return module.exports.assignRiderToOrder(orderId, newRiderId);
    } else {
      orders[oIdx].assigned_rider_id = null;
      orders[oIdx].riderName = null;
      orders[oIdx].riderPhone = null;
      orders[oIdx].riderPlate = null;
      orders[oIdx].rider_handover_status = 'unassigned';
      orders[oIdx].verification_pin = null;
      orders[oIdx].assigned_at = null;
      return { order: orders[oIdx] };
    }
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
    const riderId = orders[idx].assigned_rider_id;
    if (riderId) {
      const rIdx = riders.findIndex(r => r.id === riderId);
      if (rIdx !== -1) {
        riders[rIdx].is_available = true;
        riders[rIdx].status = 'AVAILABLE';
        riders[rIdx].current_order_id = null;
      }
    }
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
