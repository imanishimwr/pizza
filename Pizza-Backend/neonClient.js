// Neon Serverless PostgreSQL Database Client & Queries
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

module.exports = {
  sql,

  // User Queries (Neon PostgreSQL)
  findUserByEmail: async (email) => {
    if (!sql) return null;
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;`;
    return rows[0] || null;
  },

  registerUserInNeon: async ({ name, email, phone, password, googleId, avatarUrl, role = 'CUSTOMER' }) => {
    const salt = password ? await bcrypt.genSalt(10) : null;
    const passwordHash = password ? await bcrypt.hash(password, salt) : null;
    const id = `user-${Date.now()}`;

    const rows = await sql`
      INSERT INTO users (id, name, email, phone, password_hash, google_id, avatar_url, role, updated_at)
      VALUES (${id}, ${name}, ${email}, ${phone || null}, ${passwordHash}, ${googleId || null}, ${avatarUrl || null}, ${role}, NOW())
      RETURNING id, name, email, phone, avatar_url, role, created_at;
    `;

    return rows[0];
  },

  verifyLoginInNeon: async (email, password) => {
    console.log("verifyLoginInNeon called for:", email);
    if (!sql) return null;
    const user = await module.exports.findUserByEmail(email);
    console.log("Found user:", user ? user.email : 'No user');
    if (!user) return null;

    console.log("User password_hash exists?", !!user.password_hash);
    if (!user.password_hash) return null; // Google accounts sign in via Google

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log("Password match:", isMatch);
    return isMatch ? user : null;
  },

  getAllUsers: async () => {
    if (!sql) return [];
    return await sql`SELECT id, name, email, phone, avatar_url, role, created_at FROM users ORDER BY created_at DESC;`;
  },

  // --- Meals Queries ---
  getMeals: async () => {
    if (!sql) return [];
    return await sql`SELECT * FROM meals ORDER BY created_at DESC;`;
  },
  
  createMeal: async (meal) => {
    const id = meal.id || `meal-${Date.now()}`;
    const rows = await sql`
      INSERT INTO meals (id, name, category, price, description, image, spicy, "outOfStock")
      VALUES (${id}, ${meal.name}, ${meal.category}, ${meal.price}, ${meal.description || ''}, ${meal.image || ''}, ${meal.spicy || false}, ${meal.outOfStock || false})
      RETURNING *;
    `;
    return rows[0];
  },

  updateMeal: async (id, updates) => {
    // Basic fields updatable from Admin
    const rows = await sql`
      UPDATE meals 
      SET name = COALESCE(${updates.name}, name),
          price = COALESCE(${updates.price}, price),
          category = COALESCE(${updates.category}, category),
          description = COALESCE(${updates.description}, description),
          "outOfStock" = COALESCE(${updates.outOfStock}, "outOfStock"),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    return rows[0];
  },

  deleteMeal: async (id) => {
    const rows = await sql`DELETE FROM meals WHERE id = ${id} RETURNING id;`;
    return rows[0];
  },

  // --- Orders Queries ---
  getOrders: async () => {
    if (!sql) return [];
    return await sql`SELECT * FROM orders ORDER BY created_at DESC;`;
  },

  createOrder: async (order) => {
    const id = order.id || `order-${Date.now()}`;
    const rows = await sql`
      INSERT INTO orders (id, "customerName", phone, address, "totalRWF", status, "userId")
      VALUES (${id}, ${order.customerName}, ${order.phone}, ${order.address}, ${order.totalRWF || 0}, 'pending', ${order.userId || null})
      RETURNING *;
    `;
    // We would insert order_items here in a real transaction, skipping for brevity of mockup
    return rows[0];
  },

  updateOrderStatus: async (id, status, riderName) => {
    const rows = await sql`
      UPDATE orders
      SET status = ${status},
          "riderName" = COALESCE(${riderName}, "riderName"),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    return rows[0];
  },

  // --- Vouchers Queries ---
  getVouchers: async () => {
    if (!sql) return [];
    return await sql`SELECT * FROM vouchers ORDER BY created_at DESC;`;
  },

  createVoucher: async (voucher) => {
    const id = `voucher-${Date.now()}`;
    const rows = await sql`
      INSERT INTO vouchers (id, code, "discountAmount", description)
      VALUES (${id}, ${voucher.code}, ${voucher.discountAmount}, ${voucher.description || ''})
      RETURNING *;
    `;
    return rows[0];
  },

  // --- Admin Analytics ---
  getAdminAnalytics: async () => {
    if (!sql) return { totalRevenueRWF: 0, totalOrdersCount: 0, activeOrdersCount: 0 };
    const revRow = await sql`SELECT SUM("totalRWF") as total FROM orders WHERE status != 'cancelled';`;
    const counts = await sql`SELECT COUNT(id) as total, COUNT(CASE WHEN status NOT IN ('delivered', 'cancelled') THEN 1 END) as active FROM orders;`;
    
    return {
      totalRevenueRWF: revRow[0]?.total || 0,
      totalOrdersCount: counts[0]?.total || 0,
      activeOrdersCount: counts[0]?.active || 0,
    };
  }
};
