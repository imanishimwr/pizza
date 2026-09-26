// HotPot Delights UI Constants & Category Configuration
// All actual data (meals, orders, users) comes from the Neon PostgreSQL backend via apiService.

export const API_BASE_URL = 'http://localhost:5000/api';

export const CATEGORIES = [
  { id: 'all', name: 'All Items', icon: 'UtensilsCrossed' },
  { id: 'hotpot', name: 'Hotpot Combos', icon: 'Flame' },
  { id: 'broths', name: 'Spicy Broths', icon: 'Soup' },
  { id: 'pizzas', name: 'Gourmet Pizzas', icon: 'Pizza' },
  { id: 'noodles', name: 'Noodles & Rice', icon: 'Bowl' },
  { id: 'sides', name: 'Sides & Dim Sum', icon: 'ConciergeBell' },
  { id: 'drinks', name: 'Refreshments', icon: 'CupSoda' }
];

export const PROMO_BANNERS = [
  {
    id: 1,
    title: "BBQ Chicken Pizza Days",
    subtitle: "Fresh handcrafted artisan pizzas baked to perfection",
    tag: "POPULAR PIZZA",
    color: "from-amber-600 to-orange-700",
    bgGradient: "linear-gradient(135deg, #AE3200 0%, #D97706 100%)"
  },
  {
    id: 2,
    title: "Fast Delivery in Kigali",
    subtitle: "Hot, delicious meals delivered right to your doorstep",
    tag: "KIGALI EXPRESS",
    bgGradient: "linear-gradient(135deg, #128731 0%, #059669 100%)"
  },
  {
    id: 3,
    title: "Szechuan Deluxe Meal",
    subtitle: "Includes Szechuan Broth, Wagyu Beef, & Dumplings",
    tag: "CHEF RECOMMENDATION",
    bgGradient: "linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)"
  }
];
