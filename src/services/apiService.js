// HotPot Delights Persistent Data Service Layer
import { MEALS as DEFAULT_MEALS, INITIAL_ORDERS as DEFAULT_ORDERS, API_BASE_URL } from '../data/mockData';

const STORAGE_KEYS = {
  MEALS: 'hotpot_meals_v1',
  ORDERS: 'hotpot_orders_v1',
  USER: 'hotpot_user_v1',
  CART: 'hotpot_cart_v1'
};

export const apiService = {
  // Meals Persistence
  getMeals: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
      return saved ? JSON.parse(saved) : DEFAULT_MEALS;
    } catch (e) {
      return DEFAULT_MEALS;
    }
  },

  saveMeals: (meals) => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    } catch (e) {
      console.error('Error saving meals:', e);
    }
  },

  // Orders Persistence
  getOrders: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : DEFAULT_ORDERS;
    } catch (e) {
      return DEFAULT_ORDERS;
    }
  },

  saveOrders: (orders) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving orders:', e);
    }
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

  // Sync to backend if endpoint available
  syncOrderToBackend: async (order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      return await response.json();
    } catch (e) {
      console.log('Backend request saved locally.');
      return { success: true, localOnly: true };
    }
  }
};
