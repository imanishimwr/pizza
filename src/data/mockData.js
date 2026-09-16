// Authentic HotPot Delights Data & Live API Fallback Handler

export const API_BASE_URL = 'https://hotpot-backend-tsae.onrender.com/api';

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
    subtitle: "Buy 1 Get 1 Free on all Large Pizzas!",
    code: "BOGOPIZZA",
    tag: "SPECIAL PROMO",
    color: "from-amber-600 to-orange-700",
    bgGradient: "linear-gradient(135deg, #AE3200 0%, #D97706 100%)"
  },
  {
    id: 2,
    title: "Free Delivery in Kigali",
    subtitle: "On your first Hotpot combo order over 15,000 RWF",
    code: "KIGALIFREE",
    tag: "POPULAR",
    bgGradient: "linear-gradient(135deg, #128731 0%, #059669 100%)"
  },
  {
    id: 3,
    title: "Szechuan Deluxe Meal",
    subtitle: "Includes Szechuan Broth, Wagyu Beef, & Dumplings",
    code: "HOTPOT25",
    tag: "CHEF RECOMMENDATION",
    bgGradient: "linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)"
  }
];

export const MEALS = [
  {
    id: 'hp-01',
    name: 'Royal Szechuan Hotpot Combo',
    category: 'hotpot',
    price: 22000,
    rating: 4.9,
    reviews: 142,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    description: 'Signature spicy Szechuan broth served with prime sliced beef, fresh napa cabbage, shiitake mushrooms, tofu, and hand-pulled noodles.',
    spicy: true,
    spiceLevels: ['Mild Spicy 🌶️', 'Medium Szechuan 🌶️🌶️', 'Extra Fire Hot 🌶️🌶️🌶️'],
    broths: ['Szechuan Chili Oil', 'Rich Bone Broth', 'Tomato Mushroom'],
    prepTime: '20-25 min'
  },
  {
    id: 'hp-02',
    name: 'BBQ Chicken Feast Pizza',
    category: 'pizzas',
    price: 15000,
    rating: 4.8,
    reviews: 98,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    description: 'Wood-fired gourmet pizza loaded with smoked BBQ chicken breast, mozzarella, red onions, bell peppers, and fresh cilantro.',
    spicy: false,
    prepTime: '15-20 min'
  },
  {
    id: 'hp-03',
    name: 'Golden Collagen Bone Broth',
    category: 'broths',
    price: 12000,
    rating: 4.9,
    reviews: 76,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    description: 'Slow-simmered pork bone broth infused with goji berries, dates, ginger, and scallions. Pure comfort food.',
    spicy: false,
    prepTime: '15 min'
  },
  {
    id: 'hp-04',
    name: 'Seafood Hotpot Deluxe',
    category: 'hotpot',
    price: 28000,
    rating: 4.95,
    reviews: 210,
    image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=600&q=80',
    description: 'Jumbo prawns, tender calamari rings, fish fillet, sea scallops, and glass noodles served with garlic seafood dipping sauce.',
    spicy: true,
    spiceLevels: ['Mild 🌶️', 'Medium 🌶️🌶️', 'Hot 🌶️🌶️🌶️'],
    prepTime: '25 min'
  },
  {
    id: 'hp-05',
    name: 'Spicy Beef Dan Dan Noodles',
    category: 'noodles',
    price: 9500,
    rating: 4.7,
    reviews: 84,
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh wheat noodles tossed in savory chili oil, sesame paste, spiced minced beef, toasted peanuts, and bok choy.',
    spicy: true,
    prepTime: '12-15 min'
  },
  {
    id: 'hp-06',
    name: 'Crispy Pork & Shrimp Dim Sum',
    category: 'sides',
    price: 7000,
    rating: 4.8,
    reviews: 65,
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
    description: 'Steamed & pan-seared dumplings filled with minced pork, shrimp, garlic chives, served with soy vinegar sauce.',
    spicy: false,
    prepTime: '10-12 min'
  },
  {
    id: 'hp-07',
    name: 'Iced Passionfruit Jasmine Tea',
    category: 'drinks',
    price: 3500,
    rating: 4.9,
    reviews: 110,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    description: 'Freshly brewed green jasmine tea infused with real passionfruit pulp, lime slices, and popping boba.',
    spicy: false,
    prepTime: '5 min'
  },
  {
    id: 'hp-08',
    name: 'Kigali Pepperoni Special Pizza',
    category: 'pizzas',
    price: 16500,
    rating: 4.85,
    reviews: 95,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
    description: 'Triple layer smoked pepperoni, oregano, spicy honey drizzle, and extra melted mozzarella cheese on artisan crust.',
    spicy: true,
    prepTime: '18 min'
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'HP-100231',
    customerName: 'Aline Uwase',
    phone: '0788000001',
    items: [
      { name: 'Royal Szechuan Hotpot Combo', qty: 1, price: 22000, spice: 'Medium Szechuan 🌶️🌶️' },
      { name: 'Iced Passionfruit Jasmine Tea', qty: 2, price: 3500 }
    ],
    totalRWF: 29000,
    status: 'preparing', // pending | preparing | ready | delivery | delivered
    address: 'KG 9 Ave, Nyarutarama, Kigali',
    orderTime: '10:14 AM',
    paymentMethod: 'MTN Mobile Money',
    paymentStatus: 'PAID'
  },
  {
    id: 'HP-100232',
    customerName: 'Jean-Luc Habimana',
    phone: '0791234567',
    items: [
      { name: 'BBQ Chicken Feast Pizza', qty: 2, price: 15000 },
      { name: 'Crispy Pork & Shrimp Dim Sum', qty: 1, price: 7000 }
    ],
    totalRWF: 37000,
    status: 'pending',
    address: 'KN 3 Rd, Kimihurura, Kigali',
    orderTime: '10:18 AM',
    paymentMethod: 'Airtel Money',
    paymentStatus: 'PAID'
  },
  {
    id: 'HP-100230',
    customerName: 'Cynthia Ingabire',
    phone: '0788998877',
    items: [
      { name: 'Seafood Hotpot Deluxe', qty: 1, price: 28000 }
    ],
    totalRWF: 28000,
    status: 'delivery',
    riderName: 'Eric Mugisha (Rider #04)',
    riderPhone: '0781122334',
    address: 'KG 14 Ave, Gacuriro, Kigali',
    orderTime: '09:45 AM',
    paymentMethod: 'Card Payment',
    paymentStatus: 'PAID'
  }
];

export const DEMO_USERS = {
  customer: { name: 'Aline Uwase', email: 'aline@example.com', phone: '0788000001', role: 'customer' },
  kitchen: { name: 'Head Chef Patrick', email: 'kitchen@hotpot-delights.com', role: 'kitchen' },
  delivery: { name: 'Eric Mugisha (Rider #04)', email: 'rider@hotpot-delights.com', phone: '0781122334', role: 'delivery' },
  admin: { name: 'Cynthia Ingabire (Admin)', email: 'admin@hotpot-delights.com', role: 'admin' }
};
