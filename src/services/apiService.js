// HotPot Delights Persistent Data Service Layer
import { MEALS as DEFAULT_MEALS, INITIAL_ORDERS as DEFAULT_ORDERS } from '../data/mockData';
const API_BASE_URL = 'http://localhost:5000/api';

const STORAGE_KEYS = {
  MEALS: 'hotpot_meals_v1',
  ORDERS: 'hotpot_orders_v1',
  USER: 'hotpot_user_v1',
  CART: 'hotpot_cart_v1',
  WISHLIST: 'hotpot_wishlist_v1',
  TRACKED_ORDER_ID: 'hotpot_tracked_order_id_v1'
};


export const apiService = {
  // Meals Persistence
  getMeals: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/meals`);
      if (!res.ok) throw new Error('Failed to fetch meals');
      const data = await res.json();
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn('Backend unavailable, using local cache', e);
      const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
      return saved ? JSON.parse(saved) : DEFAULT_MEALS;
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
      const data = await res.json();
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn('Backend unavailable, using local cache', e);
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : DEFAULT_ORDERS;
    }
  },

  createOrder: async (orderData) => {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      return saved ? JSON.parse(saved) : { name: 'Gourmet Lover', email: 'user@hotpot.rw', address: 'KG 9 Ave, Nyarutarama, Kigali', points: 810 };
    } catch (e) {
      return { name: 'Gourmet Lover', email: 'user@hotpot.rw', address: 'KG 9 Ave, Nyarutarama, Kigali', points: 810 };
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

  // Admin Analytics API
  getAdminAnalytics: async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  }
};

