// Secure Database Interface with In-Memory Storage & Schema Guard
const bcrypt = require('bcryptjs');

let users = [
  {
    id: 'user-admin-01',
    name: 'Executive Admin',
    email: 'admin@hotpotdelights.rw',
    phone: '0788000001',
    passwordHash: '$2a$10$wT.9nK/Wb8j3X3h3H3H3H.k3H3H3H3H3H3H3H3H3H3H3H3H3H3H3H', // hashed password
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
    createdAt: new Date(Date.now() - 5 * 60000).toISOString()
  }
];

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
  }
};
