// Neon Database Seeder Utility Script
const { sql } = require('./neonClient');

// The exact initial catalog previously shipped in the frontend mockData.js.
// The customer app is now entirely backend-driven, so this data belongs in Neon.
const SEED_CATEGORIES = [
  { id: 'all', name: 'All Items', icon: 'UtensilsCrossed', sortOrder: 0 },
  { id: 'hotpot', name: 'Hotpot Combos', icon: 'Flame', sortOrder: 1 },
  { id: 'broths', name: 'Spicy Broths', icon: 'Soup', sortOrder: 2 },
  { id: 'pizzas', name: 'Gourmet Pizzas', icon: 'Pizza', sortOrder: 3 },
  { id: 'noodles', name: 'Noodles & Rice', icon: 'Bowl', sortOrder: 4 },
  { id: 'sides', name: 'Sides & Dim Sum', icon: 'ConciergeBell', sortOrder: 5 },
  { id: 'drinks', name: 'Refreshments', icon: 'CupSoda', sortOrder: 6 }
];

const SEED_PROMOS = [
  {
    title: 'BBQ Chicken Pizza Days',
    subtitle: 'Buy 1 Get 1 Free on all Large Pizzas!',
    code: 'BOGOPIZZA',
    tag: 'SPECIAL PROMO',
    color: 'from-amber-600 to-orange-700',
    bgGradient: 'linear-gradient(135deg, #AE3200 0%, #D97706 100%)',
    sortOrder: 1
  },
  {
    title: 'Free Delivery in Kigali',
    subtitle: 'On your first Hotpot combo order over 15,000 RWF',
    code: 'KIGALIFREE',
    tag: 'POPULAR',
    color: '',
    bgGradient: 'linear-gradient(135deg, #128731 0%, #059669 100%)',
    sortOrder: 2
  },
  {
    title: 'Szechuan Deluxe Meal',
    subtitle: 'Includes Szechuan Broth, Wagyu Beef, & Dumplings',
    code: 'HOTPOT25',
    tag: 'CHEF RECOMMENDATION',
    color: '',
    bgGradient: 'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)',
    sortOrder: 3
  }
];

const SEED_MEALS = [
  {
    id: 'hp-01',
    name: 'Royal Szechuan Hotpot Combo',
    category: 'hotpot',
    price: 22000,
    rating: 4.9,
    reviewsCount: 142,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    description: 'Signature spicy Szechuan broth served with prime sliced beef, fresh napa cabbage, shiitake mushrooms, tofu, and hand-pulled noodles.',
    spicy: true,
    outOfStock: false,
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
    reviewsCount: 98,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    description: 'Wood-fired gourmet pizza loaded with smoked BBQ chicken breast, mozzarella, red onions, bell peppers, and fresh cilantro.',
    spicy: false,
    outOfStock: false,
    spiceLevels: [],
    broths: [],
    prepTime: '15-20 min'
  },
  {
    id: 'hp-03',
    name: 'Golden Collagen Bone Broth',
    category: 'broths',
    price: 12000,
    rating: 4.9,
    reviewsCount: 76,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    description: 'Slow-simmered pork bone broth infused with goji berries, dates, ginger, and scallions. Pure comfort food.',
    spicy: false,
    outOfStock: false,
    spiceLevels: [],
    broths: [],
    prepTime: '15 min'
  },
  {
    id: 'hp-04',
    name: 'Seafood Hotpot Deluxe',
    category: 'hotpot',
    price: 28000,
    rating: 4.95,
    reviewsCount: 210,
    image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=600&q=80',
    description: 'Jumbo prawns, tender calamari rings, fish fillet, sea scallops, and glass noodles served with garlic seafood dipping sauce.',
    spicy: true,
    outOfStock: false,
    spiceLevels: ['Mild 🌶️', 'Medium 🌶️🌶️', 'Hot 🌶️🌶️🌶️'],
    broths: [],
    prepTime: '25 min'
  },
  {
    id: 'hp-05',
    name: 'Spicy Beef Dan Dan Noodles',
    category: 'noodles',
    price: 9500,
    rating: 4.7,
    reviewsCount: 84,
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh wheat noodles tossed in savory chili oil, sesame paste, spiced minced beef, toasted peanuts, and bok choy.',
    spicy: true,
    outOfStock: false,
    spiceLevels: [],
    broths: [],
    prepTime: '12-15 min'
  },
  {
    id: 'hp-06',
    name: 'Crispy Pork & Shrimp Dim Sum',
    category: 'sides',
    price: 7000,
    rating: 4.8,
    reviewsCount: 65,
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
    description: 'Steamed & pan-seared dumplings filled with minced pork, shrimp, garlic chives, served with soy vinegar sauce.',
    spicy: false,
    outOfStock: false,
    spiceLevels: [],
    broths: [],
    prepTime: '10-12 min'
  },
  {
    id: 'hp-07',
    name: 'Iced Passionfruit Jasmine Tea',
    category: 'drinks',
    price: 3500,
    rating: 4.9,
    reviewsCount: 110,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    description: 'Freshly brewed green jasmine tea infused with real passionfruit pulp, lime slices, and popping boba.',
    spicy: false,
    outOfStock: false,
    spiceLevels: [],
    broths: [],
    prepTime: '5 min'
  },
  {
    id: 'hp-08',
    name: 'Kigali Pepperoni Special Pizza',
    category: 'pizzas',
    price: 16500,
    rating: 4.85,
    reviewsCount: 95,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
    description: 'Triple layer smoked pepperoni, oregano, spicy honey drizzle, and extra melted mozzarella cheese on artisan crust.',
    spicy: true,
    outOfStock: false,
    spiceLevels: [],
    broths: [],
    prepTime: '18 min'
  }
];

async function seedNeonDatabase() {
  console.log('🚀 Starting Neon Cloud PostgreSQL Database Setup...');

  if (!sql) {
    console.error('❌ DATABASE_URL is missing in .env file!');
    process.exit(1);
  }

  try {
    // 1. Create Tables (idempotent — safe to run alongside migrate.js)
    console.log('📦 1/4 Creating Database Tables...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(255),
        password_hash TEXT,
        google_id VARCHAR(255) UNIQUE,
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'CUSTOMER',
        location VARCHAR(255),
        lat NUMERIC,
        lng NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS meals (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC NOT NULL,
        rating NUMERIC DEFAULT 5.0,
        "reviewsCount" INTEGER DEFAULT 0,
        description TEXT,
        image TEXT,
        spicy BOOLEAN DEFAULT FALSE,
        "outOfStock" BOOLEAN DEFAULT FALSE,
        "spiceLevels" JSONB DEFAULT '[]'::jsonb,
        broths JSONB DEFAULT '[]'::jsonb,
        "prepTime" VARCHAR(50) DEFAULT '15-20 min',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        "sortOrder" INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS promos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        code VARCHAR(100) UNIQUE NOT NULL,
        tag VARCHAR(100),
        color VARCHAR(100),
        "bgGradient" TEXT,
        active BOOLEAN DEFAULT true,
        "sortOrder" INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Insert Default Admin User
    console.log('👤 2/4 Seeding Admin User Account...');
    await sql`
      INSERT INTO users (id, name, email, phone, password_hash, role, updated_at)
      VALUES (
        'user-admin-01',
        'Executive Admin',
        'admin@hotpotdelights.rw',
        '0788000001',
        '$2a$10$wT.9nK/Wb8j3X3h3H3H3H.k3H3H3H3H3H3H3H3H3H3H3H3H3H3H3H',
        'ADMIN',
        NOW()
      )
      ON CONFLICT (email) DO NOTHING;
    `;

    // 3. Seed Categories
    console.log('🗂️ 3/4 Seeding Categories...');
    for (let i = 0; i < SEED_CATEGORIES.length; i++) {
      const cat = SEED_CATEGORIES[i];
      await sql`
        INSERT INTO categories (id, name, icon, "sortOrder", active)
        VALUES (${cat.id}, ${cat.name}, ${cat.icon}, ${cat.sortOrder}, true)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            icon = EXCLUDED.icon,
            "sortOrder" = EXCLUDED."sortOrder",
            active = true;
      `;
    }

    // 4. Seed Promo Banners
    console.log('🎁 Seeding Promo Banners...');
    for (let i = 0; i < SEED_PROMOS.length; i++) {
      const promo = SEED_PROMOS[i];
      await sql`
        INSERT INTO promos (title, subtitle, code, tag, color, "bgGradient", active, "sortOrder")
        VALUES (${promo.title}, ${promo.subtitle}, ${promo.code}, ${promo.tag}, ${promo.color}, ${promo.bgGradient}, true, ${promo.sortOrder})
        ON CONFLICT (code) DO UPDATE
        SET title = EXCLUDED.title,
            subtitle = EXCLUDED.subtitle,
            tag = EXCLUDED.tag,
            color = EXCLUDED.color,
            "bgGradient" = EXCLUDED."bgGradient",
            active = true,
            "sortOrder" = EXCLUDED."sortOrder";
      `;
    }

    // 5. Seed Food Items & Specials with full UI shape (JSON arrays included)
    console.log('🍕 4/4 Seeding Hotpot & Gourmet Pizza Catalog...');
    for (let i = 0; i < SEED_MEALS.length; i++) {
      const m = SEED_MEALS[i];
      // Stagger created_at so the frontend "Recently Uploaded" marquee has a
      // deterministic, newest-first ordering identical across re-seeds.
      await sql`
        INSERT INTO meals (
          id, name, category, price, rating, "reviewsCount", description, image,
          spicy, "outOfStock", "spiceLevels", broths, "prepTime",
          created_at, updated_at
        )
        VALUES (
          ${m.id}, ${m.name}, ${m.category}, ${m.price}, ${m.rating}, ${m.reviewsCount},
          ${m.description}, ${m.image},
          ${m.spicy}, ${m.outOfStock},
          ${JSON.stringify(m.spiceLevels)}, ${JSON.stringify(m.broths)},
          ${m.prepTime},
          NOW() - (${SEED_MEALS.length - i} * INTERVAL '1 hour'), NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            category = EXCLUDED.category,
            price = EXCLUDED.price,
            rating = EXCLUDED.rating,
            "reviewsCount" = EXCLUDED."reviewsCount",
            description = EXCLUDED.description,
            image = EXCLUDED.image,
            spicy = EXCLUDED.spicy,
            "outOfStock" = EXCLUDED."outOfStock",
            "spiceLevels" = EXCLUDED."spiceLevels",
            broths = EXCLUDED.broths,
            "prepTime" = EXCLUDED."prepTime",
            updated_at = NOW();
      `;
    }

    // Query Totals
    const mealsCount = await sql`SELECT COUNT(*) FROM meals;`;
    const usersCount = await sql`SELECT COUNT(*) FROM users;`;
    const categoriesCount = await sql`SELECT COUNT(*) FROM categories;`;
    const promosCount = await sql`SELECT COUNT(*) FROM promos;`;

    console.log('\n🎉 SUCCESS! Your Neon Cloud PostgreSQL Database is 100% Set Up & Populated!');
    console.log(`📊 Meals in Database: ${mealsCount[0].count}`);
    console.log(`📊 Categories in Database: ${categoriesCount[0].count}`);
    console.log(`📊 Promos in Database: ${promosCount[0].count}`);
    console.log(`📊 Users in Database: ${usersCount[0].count}`);
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  }
}

seedNeonDatabase();