require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Starting Neon Database Migration...");

  try {
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
        status VARCHAR(50) DEFAULT 'PENDING',
        "totalRWF" NUMERIC NOT NULL,
        "riderName" VARCHAR(255),
        "paymentType" VARCHAR(100) DEFAULT 'MTN Mobile Money',
        "paymentStatus" VARCHAR(50) DEFAULT 'PAID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Orders table created.");

    // 3. Create Order Items Table
    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(255) PRIMARY KEY,
        "orderId" VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
        "mealId" VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        qty INTEGER NOT NULL,
        price NUMERIC NOT NULL
      );
    `;
    console.log("✅ Order Items table created.");

    // 4. Create Vouchers Table
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

    console.log("🎉 Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}

migrate();
