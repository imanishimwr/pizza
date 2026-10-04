/**
 * UI configuration only.
 *
 * Meals, orders, riders, users and revenue all come from the API via apiService.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const CATEGORIES = [
  { id: 'all', name: 'All items', icon: 'UtensilsCrossed' },
  { id: 'hotpot', name: 'Hotpot combos', icon: 'Flame' },
  { id: 'pizzas', name: 'Gourmet pizzas', icon: 'Pizza' },
  { id: 'sides', name: 'Sides & dim sum', icon: 'ConciergeBell' },
  { id: 'drinks', name: 'Drinks', icon: 'CupSoda' }
];

export const CATEGORY_LABELS = CATEGORIES.reduce((acc, category) => {
  acc[category.id] = category.name;
  return acc;
}, {});

/** Readable label for a canonical lowercase order status. */
export const ORDER_STATUS_LABELS = {
  ongoing: 'Ongoing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending: 'Ongoing',
  preparing: 'Ongoing',
  delivery: 'Ongoing'
};

export const PROMO_BANNERS = [
  {
    id: 1,
    title: 'Gourmet Pizza Days',
    subtitle: 'Handcrafted artisan pizzas, baked fresh to order',
    tag: 'POPULAR',
    bgGradient: 'linear-gradient(135deg, #AE3200 0%, #D97706 100%)'
  },
  {
    id: 2,
    title: 'Fast delivery in Kigali',
    subtitle: 'Hot meals delivered across the city',
    tag: 'KIGALI EXPRESS',
    bgGradient: 'linear-gradient(135deg, #128731 0%, #059669 100%)'
  },
  {
    id: 3,
    title: 'Szechuan Deluxe Meal',
    subtitle: 'Split-pot Szechuan fire and rich bone broth',
    tag: 'CHEF PICK',
    bgGradient: 'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)'
  }
];

export const CONTACT = {
  address: 'KG 9 Ave, Nyarutarama, Kigali',
  phone: '+250 788 000 001',
  email: 'hello@hotpotdelights.rw'
};
