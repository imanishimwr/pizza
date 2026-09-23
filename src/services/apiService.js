// HotPot Delights Persistent Data Service Layer
const API_BASE_URL = 'http://localhost:5000/api';

const STORAGE_KEYS = {
  MEALS: 'hotpot_meals_v1',
  ORDERS: 'hotpot_orders_v1',
  USER: 'hotpot_user_v1',
  CART: 'hotpot_cart_v1',
  WISHLIST: 'hotpot_wishlist_v1',
  TRACKED_ORDER_ID: 'hotpot_tracked_order_id_v1'
};

// Every per-user slice of data (cart, wishlist, orders cache) is namespaced by
// account id so one browser never leaks a user's items to another user.
const scopeKey = (base, user) => {
  const id = user && user.id ? String(user.id) : 'guest';
  return `${base}:${id}`;
};

// Attach the JWT so the server can scope responses to the logged-in account.
const authHeaders = (extra = {}) => {
  let token = null;
  try {
    token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
  } catch (e) {}
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};

export const apiService = {
  // Meals Persistence
  getMeals: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/meals`);
      if (!res.ok) throw new Error('Failed to fetch meals');
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(data));
        return data;
      }
      return [];
    } catch (e) {
      console.warn('Backend unavailable, checking local cache', e);
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
        const parsed = saved ? JSON.parse(saved) : null;
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }
  },

  createMeal: async (mealData, token) => {
    const res = await fetch(`${API_BASE_URL}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(mealData)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`${res.status}: ${errBody.error || 'Failed to create meal'}`);
    }
    const created = await res.json();
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.MEALS);
      const list = cached ? JSON.parse(cached) : [];
      if (Array.isArray(list)) {
        localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([created, ...list.filter(m => m.id !== created.id)]));
      }
    } catch (e) {}
    return created;
  },

  updateMeal: async (id, mealData, token) => {
    const res = await fetch(`${API_BASE_URL}/meals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(mealData)
    });
    if (!res.ok) throw new Error('Failed to update meal');
    return res.json();
  },

  deleteMeal: async (id, token) => {
    const res = await fetch(`${API_BASE_URL}/meals/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete meal');
    return res.json();
  },

  // Orders Persistence (server scopes results to the requesting user)
  getOrders: async (user) => {
    try {
      const trackedId = apiService.getTrackedOrderId();
      const params = new URLSearchParams();
      if (trackedId) params.set('orderId', trackedId);
      const qs = params.toString();
      const url = `${API_BASE_URL}/orders${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(scopeKey(STORAGE_KEYS.ORDERS, user), JSON.stringify(data));
        return data;
      }
      return [];
    } catch (e) {
      console.warn('Backend unavailable, checking local cache', e);
      try {
        const saved = localStorage.getItem(scopeKey(STORAGE_KEYS.ORDERS, user));
        const parsed = saved ? JSON.parse(saved) : null;
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }
  },

  saveOrders: (orders, user) => {
    try {
      localStorage.setItem(scopeKey(STORAGE_KEYS.ORDERS, user), JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving orders:', e);
    }
  },

  createOrder: async (orderData) => {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(orderData)
    });
    if (!res.ok) throw new Error('Failed to create order');
    return res.json();
  },

  updateOrderStatus: async (id, status, riderName, token) => {
    const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status, riderName })
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },

  // User Session Persistence
  getUser: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  },

  saveUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.error('Error saving user:', e);
    }
  },

  register: async ({ name, email, phone, password, role = 'CUSTOMER' }) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, role })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    return data;
  },

  login: async ({ email, password }) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Invalid email or password.');
    }
    return data;
  },

  // Cart Persistence is scoped per account (guests use their own guest cart)
  getCart: (user) => {
    try {
      const saved = localStorage.getItem(scopeKey(STORAGE_KEYS.CART, user));
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart: (cart, user) => {
    try {
      localStorage.setItem(scopeKey(STORAGE_KEYS.CART, user), JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  },

  // Wishlist Persistence is scoped per account too
  getWishlist: (user) => {
    try {
      const saved = localStorage.getItem(scopeKey(STORAGE_KEYS.WISHLIST, user));
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  saveWishlist: (wishlist, user) => {
    try {
      localStorage.setItem(scopeKey(STORAGE_KEYS.WISHLIST, user), JSON.stringify(wishlist));
    } catch (e) {
      console.error('Error saving wishlist:', e);
    }
  },


  // Active Tracked Order Persistence
  getTrackedOrderId: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TRACKED_ORDER_ID) || null;
    } catch (e) {
      return null;
    }
  },

  setTrackedOrderId: (orderId) => {
    try {
      if (orderId) {
        localStorage.setItem(STORAGE_KEYS.TRACKED_ORDER_ID, orderId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TRACKED_ORDER_ID);
      }
    } catch (e) {
      console.error('Error saving tracked order id:', e);
    }
  },

  // Vouchers API
  getVouchers: async () => {
    const res = await fetch(`${API_BASE_URL}/vouchers`);
    if (!res.ok) throw new Error('Failed to fetch vouchers');
    return res.json();
  },

  createVoucher: async (voucherData, token) => {
    const res = await fetch(`${API_BASE_URL}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(voucherData)
    });
    if (!res.ok) throw new Error('Failed to create voucher');
    return res.json();
  },

  // Admin Analytics API
  getAdminAnalytics: async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  }
};

