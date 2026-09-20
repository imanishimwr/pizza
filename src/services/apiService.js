// HotPot Delights Persistent Data Service Layer
export const API_BASE_URL = 'http://localhost:5000/api';

const STORAGE_KEYS = {
  MEALS: 'hotpot_meals_v1',
  ORDERS: 'hotpot_orders_v1',
  USER: 'hotpot_user_v1',
  CART: 'hotpot_cart_v1',
  WISHLIST: 'hotpot_wishlist_v1',
  TRACKED_ORDER_ID: 'hotpot_tracked_order_id_v1'
};

// Auto-clear localStorage when app schema version changes (removes stale mock data)
const APP_VERSION = 'real-data-v2';
try {
  if (localStorage.getItem('hotpot_app_version') !== APP_VERSION) {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.setItem('hotpot_app_version', APP_VERSION);
  }
} catch (_) { /* ignore in SSR or privacy mode */ }


// Normalize API rows into the shape the UI expects, with sensible empty
// defaults — the catalog always comes from the backend, never hardcoded.
const normalizeMeals = (meals) => {
  if (!Array.isArray(meals)) return [];
  return meals.map((meal) => ({
    rating: 5.0,
    reviews: 0,
    spiceLevels: [],
    broths: [],
    prepTime: '15-20 min',
    spicy: false,
    outOfStock: false,
    ...meal,
    fallbackImage: meal.image || meal.fallbackImage || ''
  }));
};

const normalizeOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  return orders.map((order) => {
    const orderTime =
      order.orderTime ||
      (order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—');
    return {
      items: [],
      orderTime,
      address: '',
      paymentMethod: 'MTN Mobile Money',
      paymentStatus: 'PAID',
      status: 'pending',
      created: order.createdAt || order.created || null,
      ...order,
      orderTime,
      paymentMethod: order.paymentMethod || order.paymentType || 'MTN Mobile Money',
      items: Array.isArray(order.items) ? order.items : []
    };
  });
};

export const apiService = {
  // Config Persistence
  getCategories: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, returning empty categories', e);
      return [];
    }
  },

  getPromos: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/promos`);
      if (!res.ok) throw new Error('Failed to fetch promos');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, returning empty promos', e);
      return [];
    }
  },

  // Meals Persistence
  getMeals: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/meals`);
      if (!res.ok) throw new Error('Failed to fetch meals');
      const data = normalizeMeals(await res.json());
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn('Backend unavailable, using local cache', e);
      const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
      return saved ? normalizeMeals(JSON.parse(saved)) : [];
    }
  },

  // Categories & Promos API
  getCategories: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using fallback categories', e);
      return [{ id: 'all', name: 'All Items', icon: 'UtensilsCrossed' }];
    }
  },

  getPromos: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/promos`);
      if (!res.ok) throw new Error('Failed to fetch promos');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using empty promos', e);
      return [];
    }
  },

  createMeal: async (mealData, token) => {
    const res = await fetch(`${API_BASE_URL}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(mealData)
    });
    if (!res.ok) throw new Error('Failed to create meal');
    return res.json();
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

  // Orders Persistence
  getOrders: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = normalizeOrders(await res.json());
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn('Backend unavailable, using local cache', e);
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? normalizeOrders(JSON.parse(saved)) : [];
    }
  },

  createOrder: async (orderData) => {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (!res.ok) throw new Error('Failed to create order');
    const created = await res.json();
    return normalizeOrders([{ ...orderData, ...created }])[0];
  },

  updateOrderStatus: async (id, status, riderName, token) => {
    const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status, riderName })
    });
    if (!res.ok) throw new Error('Failed to update order status');
    const updated = await res.json();
    return normalizeOrders([updated])[0];
  },

  // User Session Persistence
  getUser: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null; // null = not logged in
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

  // Cart Persistence across all MPA pages
  getCart: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart: (cart) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  },

  // Wishlist Persistence
  getWishlist: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  saveWishlist: (wishlist) => {
    try {
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
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

  // Kitchen Board API
  getKitchenQueue: async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/kitchen/queue`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.status === 403 || res.status === 401) {
        // No kitchen token — fall back to public orders endpoint
        const ordersRes = await fetch(`${API_BASE_URL}/orders`);
        if (!ordersRes.ok) throw new Error('Failed to fetch orders');
        const allOrders = await ordersRes.json();
        const queue = allOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
        return { orders: queue, stats: {} };
      }
      if (!res.ok) throw new Error('Failed to fetch kitchen queue');
      return res.json();
    } catch (e) {
      // Network error — try public orders as last resort
      const ordersRes = await fetch(`${API_BASE_URL}/orders`).catch(() => null);
      if (ordersRes && ordersRes.ok) {
        const allOrders = await ordersRes.json();
        const queue = allOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
        return { orders: queue, stats: {} };
      }
      throw e;
    }
  },

  updateKitchenOrderStatus: async (id, status, token) => {
    const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
    // Try kitchen-specific endpoint first
    const res = await fetch(`${API_BASE_URL}/kitchen/orders/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    });
    if (res.status === 403 || res.status === 401) {
      // Fall back to public status endpoint
      const res2 = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PATCH',
        // A valid non-kitchen token (for example a customer token) makes the
        // tokenless demo route reject the request instead of using its public
        // compatibility behavior.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res2.ok) throw new Error('Failed to update order status');
      const updated = await res2.json();
      return { order: updated, stats: {} };
    }
    if (!res.ok) throw new Error('Failed to update kitchen order status');
    return res.json(); // { order, stats }
  },

  createWalkInOrder: async (orderData, token) => {
    const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
    const res = await fetch(`${API_BASE_URL}/kitchen/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    });
    if (res.status === 403 || res.status === 401) {
      const fallback = await fetch(`${API_BASE_URL}/kitchen/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!fallback.ok) throw new Error('Failed to create walk-in order');
      return fallback.json();
    }
    if (!res.ok) throw new Error('Failed to create walk-in order');
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

