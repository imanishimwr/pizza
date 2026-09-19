// Neon Database Seeder Utility Script
const { sql } = require('./neonClient');

async function seedNeonDatabase() {
  console.log('🚀 Starting Neon Cloud PostgreSQL Database Setup...');

  if (!sql) {
    console.error('❌ DATABASE_URL is missing in .env file!');
    process.exit(1);
  }

  try {
    // 1. Create Tables
    console.log('📦 1/3 Creating Database Tables...');
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS meals (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC NOT NULL,
        rating NUMERIC DEFAULT 5.0,
        description TEXT,
        image TEXT,
        spicy BOOLEAN DEFAULT FALSE,
        out_of_stock BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        total_rwf NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        rider_name VARCHAR(255),
        payment_method VARCHAR(100) DEFAULT 'MTN Mobile Money',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Insert Default Admin User
    console.log('👤 2/3 Seeding Admin User Account...');
    await sql`
      INSERT INTO users (id, name, email, phone, password_hash, role)
      VALUES (
        'user-admin-01',
        'Executive Admin',
        'admin@hotpotdelights.rw',
        '0788000001',
        '$2a$10$wT.9nK/Wb8j3X3h3H3H3H.k3H3H3H3H3H3H3H3H3H3H3H3H3H3H3H',
        'ADMIN'
      )
      ON CONFLICT (email) DO NOTHING;
    `;

    // 3. Insert Initial Food Items & Specials
    console.log('🍕 3/3 Seeding Hotpot & Gourmet Pizza Catalog...');
    await sql`
      INSERT INTO meals (id, name, category, price, rating, description, image, spicy, out_of_stock)
      VALUES 
        ('hp-01', 'Royal Szechuan Hotpot Combo', 'hotpot', 22000, 4.9, 'Signature spicy Szechuan broth served with prime sliced beef, fresh napa cabbage, shiitake mushrooms, tofu, and hand-pulled noodles.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80', true, false),
        ('hp-02', 'BBQ Chicken & Mushroom Pizza', 'pizzas', 14500, 4.8, 'Fresh mozzarella, smoked BBQ chicken, wild mushrooms, oregano, and garlic infused olive oil crust.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80', false, false),
        ('hp-03', 'Kigali Supreme Hotpot Feast', 'hotpot', 28000, 5.0, 'Double flavor split hotpot bowl featuring half Szechuan Fire and half Rich Bone Marrow Broth.', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80', true, false)
      ON CONFLICT (id) DO NOTHING;
    `;

    // Query Totals
    const mealsCount = await sql`SELECT COUNT(*) FROM meals;`;
    const usersCount = await sql`SELECT COUNT(*) FROM users;`;

    console.log('\n🎉 SUCCESS! Your Neon Cloud PostgreSQL Database is 100% Set Up & Populated!');
    console.log(`📊 Meals in Database: ${mealsCount[0].count}`);
    console.log(`📊 Users in Database: ${usersCount[0].count}`);
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  }
}

seedNeonDatabase();
