/**
 * HotPot Delights — Authoritative Database Schema
 *
 * This file is the SINGLE SOURCE OF TRUTH for the database shape.
 * It is idempotent and safe to re-run. It no longer conflicts with seed.js
 * (seed.js calls into this same schema and never issues DDL of its own).
 *
 * Canonical conventions enforced here:
 *   - All identifiers are snake_case in Postgres. The API layer is the only
 *     place that converts to camelCase, so there is exactly one mapping.
 *   - `orders.status` is lowercase text with a CHECK constraint, so the
 *     Kanban filters in the UI can never miss a row due to casing.
 *   - Money is NUMERIC and always coerced to an integer number of RWF at the
 *     API boundary. No floating point money anywhere.
 *   - `order_items` carries spice / broth / specialNote, which the kitchen and
 *     receipt layers depend on.
 *   - Dispatch columns (rider_id, verification_pin, timestamps) live on the
 *     order so assignments survive a restart and are visible to every reader.
 */
require('dotenv').config();
const { Pool } = require('pg');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id            VARCHAR(255) PRIMARY KEY,
     name          VARCHAR(255) NOT NULL,
     email         VARCHAR(255) UNIQUE NOT NULL,
     phone         VARCHAR(50),
     password_hash TEXT,
     google_id     VARCHAR(255) UNIQUE,
     avatar_url    TEXT,
     role          VARCHAR(50) NOT NULL DEFAULT 'customer'
                     CHECK (role IN ('customer','kitchen','delivery','admin')),
     token_version INTEGER NOT NULL DEFAULT 1,
     location      TEXT,
     lat           DOUBLE PRECISION,
     lng           DOUBLE PRECISION,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS meals (
     id             VARCHAR(255) PRIMARY KEY,
     name           VARCHAR(255) NOT NULL,
     category       VARCHAR(100) NOT NULL,
     price          NUMERIC(12,0) NOT NULL CHECK (price >= 0),
     rating         NUMERIC(3,2) NOT NULL DEFAULT 5.00,
     reviews_count  INTEGER NOT NULL DEFAULT 0,
     description    TEXT NOT NULL DEFAULT '',
     image          TEXT,
     fallback_image TEXT,
     spicy          BOOLEAN NOT NULL DEFAULT FALSE,
     out_of_stock   BOOLEAN NOT NULL DEFAULT FALSE,
     spice_levels   TEXT,
     broths         TEXT,
     created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS vouchers (
     code             VARCHAR(64) PRIMARY KEY,
     discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
     active           BOOLEAN NOT NULL DEFAULT TRUE,
     max_uses         INTEGER,
     used_count       INTEGER NOT NULL DEFAULT 0,
     expires_at       TIMESTAMPTZ,
     created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS orders (
     id               VARCHAR(255) PRIMARY KEY,
     user_id          VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
     customer_name    VARCHAR(255) NOT NULL,
     phone            VARCHAR(50) NOT NULL,
     address          TEXT NOT NULL,
     lat              DOUBLE PRECISION,
     lng              DOUBLE PRECISION,
     area             VARCHAR(120),
     status           VARCHAR(32) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','preparing','ready','delivery','delivered','cancelled')),
     total_rwf        NUMERIC(12,0) NOT NULL CHECK (total_rwf >= 0),
     order_type       VARCHAR(32) NOT NULL DEFAULT 'delivery'
                       CHECK (order_type IN ('delivery','takeout','dine-in')),
     notes            TEXT,
     rider_id         VARCHAR(255),
     rider_name       VARCHAR(255),
     verification_pin VARCHAR(255),
     assigned_at      TIMESTAMPTZ,
     handed_over_at   TIMESTAMPTZ,
     payment_method   VARCHAR(64) NOT NULL DEFAULT 'MTN Mobile Money',
     payment_status   VARCHAR(32) NOT NULL DEFAULT 'pending'
                         CHECK (payment_status IN ('pending','paid','failed','refunded')),
     payment_ref      VARCHAR(128),
     distance_km      NUMERIC(6,2),
     eta_minutes      INTEGER,
     eta_time         VARCHAR(16),
     created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS order_items (
     id           VARCHAR(255) PRIMARY KEY,
     order_id     VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     meal_id      VARCHAR(255),
     name         VARCHAR(255) NOT NULL,
     qty          INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
     price        NUMERIC(12,0) NOT NULL CHECK (price >= 0),
     spice        VARCHAR(64),
     broth        VARCHAR(64),
     special_note TEXT NOT NULL DEFAULT ''
   )`,

  `CREATE TABLE IF NOT EXISTS feedbacks (
     id           VARCHAR(255) PRIMARY KEY,
     order_id     VARCHAR(255) NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
     user_id      VARCHAR(255),
     pizza_rating INTEGER NOT NULL CHECK (pizza_rating BETWEEN 1 AND 5),
     rider_rating INTEGER NOT NULL CHECK (rider_rating BETWEEN 1 AND 5),
     rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
     comment      TEXT,
     created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS riders (
     id                VARCHAR(255) PRIMARY KEY,
     name              VARCHAR(255) NOT NULL,
     email             VARCHAR(255) UNIQUE,
     phone             VARCHAR(50),
     plate_number      VARCHAR(64),
     vehicle_type      VARCHAR(120),
     shift             VARCHAR(64),
     is_available      BOOLEAN NOT NULL DEFAULT FALSE,
     status            VARCHAR(32) NOT NULL DEFAULT 'off_duty'
                         CHECK (status IN ('available','busy','off_duty')),
     current_order_id  VARCHAR(255),
     earnings_today    NUMERIC(12,0) NOT NULL DEFAULT 0,
     completed_today   INTEGER NOT NULL DEFAULT 0,
     last_lat          DOUBLE PRECISION,
     last_lng          DOUBLE PRECISION,
     last_seen_at      TIMESTAMPTZ,
     created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  // Indexes for the access patterns the app actually uses.
  `CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders (status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_rider       ON orders (rider_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order  ON order_items (order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_feedbacks_created  ON feedbacks (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_meals_category     ON meals (category)`,
];

// Columns added after the first release. Each is individually guarded so the
// migration can be applied to a database created by an older build.
const COLUMN_ADDITIONS = [
  ['meals', 'fallback_image', 'TEXT'],
  ['meals', 'spice_levels', 'TEXT'],
  ['meals', 'broths', 'TEXT'],
  ['orders', 'area', 'VARCHAR(120)'],
  ['orders', 'notes', 'TEXT'],
  ['orders', 'order_type', "VARCHAR(32) NOT NULL DEFAULT 'delivery'"],
  ['orders', 'rider_id', 'VARCHAR(255)'],
  ['orders', 'rider_name', 'VARCHAR(255)'],
  ['orders', 'verification_pin', 'VARCHAR(255)'],
  ['orders', 'assigned_at', 'TIMESTAMPTZ'],
  ['orders', 'handed_over_at', 'TIMESTAMPTZ'],
  ['orders', 'payment_ref', 'VARCHAR(128)'],
  ['orders', 'distance_km', 'NUMERIC(6,2)'],
  ['orders', 'eta_minutes', 'INTEGER'],
  ['orders', 'eta_time', 'VARCHAR(16)'],
  // Payment proof upload (added for checkout workflow)
  ['orders', 'payment_proof_url', 'TEXT'],
  ['orders', 'payment_verified_at', 'TIMESTAMPTZ'],
  ['users', 'location', 'TEXT'],
  ['users', 'lat', 'DOUBLE PRECISION'],
  ['users', 'lng', 'DOUBLE PRECISION'],
  ['users', 'google_id', 'VARCHAR(255)'],
  ['users', 'password_hash', 'TEXT'],
  ['users', 'avatar_url', 'TEXT'],
  ['users', 'role', "VARCHAR(50) NOT NULL DEFAULT 'customer'"],
  ['users', 'token_version', 'INTEGER NOT NULL DEFAULT 1'],
  ['feedbacks', 'updated_at', 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'],
  ['riders', 'current_order_id', 'VARCHAR(255)'],
  ['riders', 'earnings_today', 'NUMERIC(12,0) NOT NULL DEFAULT 0'],
  ['riders', 'completed_today', 'INTEGER NOT NULL DEFAULT 0'],
  ['riders', 'last_lat', 'DOUBLE PRECISION'],
  ['riders', 'last_lng', 'DOUBLE PRECISION'],
  ['riders', 'last_seen_at', 'TIMESTAMPTZ'],
  ['riders', 'updated_at', 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'],
];

async function tableExists(sql, name) {
  const rows = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name};
  `;
  return rows.length > 0;
}

async function columnExists(sql, table, column) {
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column};
  `;
  return rows.length > 0;
}

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const err = new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    err.code = 'NO_DATABASE_URL';
    throw err;
  }

  const useSsl =
    connectionString.includes('sslmode=require') ||
    connectionString.includes('.neon.tech') ||
    process.env.PGSSL === 'true';

  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false
  });

  async function sql(strings, ...values) {
    if (typeof strings === 'string') {
      const res = await pool.query(strings, values);
      return res.rows;
    }
    let queryText = '';
    for (let i = 0; i < strings.length; i++) {
      queryText += strings[i];
      if (i < values.length) {
        queryText += `$${i + 1}`;
      }
    }
    const result = await pool.query(queryText, values);
    return result.rows;
  }
  sql.query = async (text, params = []) => {
    const result = await pool.query(text, params);
    return result.rows;
  };

  console.log('Applying HotPot schema...');

  // Tables are created in dependency order; `users` must exist before `orders`
  // because orders carries a foreign key to it.
  for (const statement of SCHEMA) {
    await sql.query(statement);
  }
  console.log(`  ${SCHEMA.length} tables/indexes ensured.`);

  for (const [table, column, type] of COLUMN_ADDITIONS) {
    if (!(await tableExists(sql, table))) continue;
    if (await columnExists(sql, table, column)) continue;
    await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type};`);
    console.log(`  + ${table}.${column}`);
  }

  // Drop the legacy camelCase / snake_case duplicates left behind by the old
  // migrate.js and seed.js, so a stale column can never shadow the canonical
  // one. IF EXISTS makes this safe on a fresh database.
  const legacyColumns = [
    ['orders', 'totalRWF'], ['orders', 'customerName'], ['orders', 'riderName'],
    ['orders', 'paymentType'], ['orders', 'paymentMethod'], ['orders', 'userId'],
    ['order_items', 'orderId'], ['order_items', 'specialNote'],
    ['meals', 'outOfStock'], ['meals', 'reviewsCount'],
  ];
  for (const [table, column] of legacyColumns) {
    if (!(await tableExists(sql, table))) continue;
    if (!(await columnExists(sql, table, column))) continue;
    await sql.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "${column}";`);
    console.log(`  - ${table}.${column} (legacy)`);
  }

  // Expand the payment_status CHECK constraint to support the new
  // 'payment_review' value without breaking existing data.
  try {
    await sql.query(`
      ALTER TABLE orders
        DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    `);
    await sql.query(`
      ALTER TABLE orders
        ADD CONSTRAINT orders_payment_status_check
        CHECK (payment_status IN ('pending','payment_review','paid','failed','refunded'));
    `);
    console.log('  ✓ payment_status CHECK constraint expanded.');
  } catch (err) {
    console.warn('  ⚠ Could not update payment_status constraint:', err.message);
  }

  console.log('Schema is up to date.');
  await pool.end();
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { migrate };
