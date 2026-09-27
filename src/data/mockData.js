/**
 * UI configuration only.
 *
 * Meals, orders, riders, users and revenue all come from the API. Nothing in
 * this file may be presented to a customer as real inventory or as a real
 * transaction.
 */

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
  pending: 'Received',
  preparing: 'In the kitchen',
  ready: 'Ready for pickup',
  delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
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
