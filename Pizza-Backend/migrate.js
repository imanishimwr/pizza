require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Starting Neon Database Migration...");

  try {
    // 0. Since orders reference users, bootstrap the users table first (idempotent).
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password_hash TEXT,
        google_id VARCHAR(255) UNIQUE,
        avatar_url TEXT,
        provider VARCHAR(50) DEFAULT 'LOCAL',
        role VARCHAR(50) DEFAULT 'CUSTOMER',
        location VARCHAR(255),
        lat NUMERIC,
        lng NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Users table ensured.");

    // 1. Create Meals Table
    await sql`
      CREATE TABLE IF NOT EXISTS meals (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC NOT NULL,
        rating NUMERIC DEFAULT 5.0,
        "reviewsCount" INTEGER DEFAULT 1,
        description TEXT,
        image TEXT,
        spicy BOOLEAN DEFAULT false,
        "outOfStock" BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Meals table created.");

    // 1b. Backfill complex meal fields used by the customer UI (idempotent).
    await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS "spiceLevels" JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS broths JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE meals ADD COLUMN IF NOT EXISTS "prepTime" VARCHAR(50) DEFAULT '15-20 min';`;
    console.log("✅ Meals spiceLevels / broths / prepTime columns ensured.");

    // 2. Create Orders Table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) REFERENCES users(id),
        "customerName" VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        lat NUMERIC,
        lng NUMERIC,
        status VARCHAR(50) DEFAULT 'pending',
        "totalRWF" NUMERIC NOT NULL,
        "riderName" VARCHAR(255),
        "paymentType" VARCHAR(100) DEFAULT 'MTN Mobile Money',
        "paymentStatus" VARCHAR(50) DEFAULT 'PAID',
        prepared_at TIMESTAMP DEFAULT NULL,
        ready_at TIMESTAMP DEFAULT NULL,
        delivered_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Orders table created.");

    // 3. Create Order Items Table (includes kitchen fields)
    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(255) PRIMARY KEY,
        "orderId" VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
        "mealId" VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        qty INTEGER NOT NULL,
        price NUMERIC NOT NULL,
        spice TEXT,
        broth TEXT,
        "specialNote" TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Order Items table created.");

    // 4. Backfill kitchen fields on pre-existing tables (idempotent, safe on every run)
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS spice TEXT;`;
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS broth TEXT;`;
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "specialNote" TEXT;`;
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMP DEFAULT NULL;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP DEFAULT NULL;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP DEFAULT NULL;`;
    console.log("✅ Kitchen timestamp + item fields ensured.");

    // 5. Create Vouchers Table
    await sql`
      CREATE TABLE IF NOT EXISTS vouchers (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        "discountPercent" INTEGER,
        "discountAmount" NUMERIC,
        description TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Vouchers table created.");

    // 6. Create Categories Table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Categories table created.");

    // 7. Create Promos Table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Promos table created.");

    console.log("🎉 Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}

migrate();
