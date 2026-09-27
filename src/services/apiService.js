// HotPot Delights Persistent Data Service Layer
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api';

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

  // Orders Persistence
  getOrders: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data));
        return data;
      }
      return [];
    } catch (e) {
      console.warn('Backend unavailable, checking local cache', e);
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
        const parsed = saved ? JSON.parse(saved) : null;
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
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

  // Reviews & Ratings API
  getReviews: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('Error fetching reviews:', e);
      return [];
    }
  },

  submitReview: async (reviewData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (!res.ok) throw new Error('Failed to submit review');
      return await res.json();
    } catch (e) {
      console.error('Error submitting review:', e);
      throw e;
    }
  },

  // Admin Analytics API
  getAdminAnalytics: async (token) => {
    const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // --------------------------------------------------
  // Smart Dispatch & Rider Fleet Management API
  // --------------------------------------------------
  getRiders: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/riders`);
      if (!res.ok) throw new Error('Failed to fetch riders');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Backend unavailable, using default riders fleet');
      return [
        {
          id: 'rider-1',
          name: 'Eric Mugisha',
          phone: '+250 788 123 456',
          plateNumber: 'RAC 402B',
          vehicleType: 'Yamaha XTZ 125 (Moto #1)',
          shift: 'Day Shift (08:00 - 16:00)',
          is_available: true,
          status: 'AVAILABLE',
          current_order_id: null,
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
    }
  },

  createRider: async (riderData) => {
    const res = await fetch(`${API_BASE_URL}/riders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(riderData)
    });
    if (!res.ok) throw new Error('Failed to create rider');
    return res.json();
  },

  toggleRiderAvailability: async (riderId, is_available) => {
    const res = await fetch(`${API_BASE_URL}/riders/${riderId}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available })
    });
    if (!res.ok) throw new Error('Failed to toggle rider availability');
    return res.json();
  },

  updateRider: async (riderId, data) => {
    const res = await fetch(`${API_BASE_URL}/riders/${riderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update rider');
    return res.json();
  },

  assignRiderToOrder: async (orderId, riderId) => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/assign-rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to assign rider');
    }
    return res.json();
  },

  verifyHandoverPickup: async (orderId, verificationPin) => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/handover-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationPin })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to verify handover pickup');
    }
    return res.json();
  },

  reassignRider: async (orderId, newRiderId) => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/reassign-rider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRiderId })
    });
    if (!res.ok) throw new Error('Failed to reassign rider');
    return res.json();
  }
};

