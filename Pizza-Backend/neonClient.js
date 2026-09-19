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
      INSERT INTO users (id, name, email, phone, password_hash, google_id, avatar_url, role)
      VALUES (${id}, ${name}, ${email}, ${phone || null}, ${passwordHash}, ${googleId || null}, ${avatarUrl || null}, ${role})
      RETURNING id, name, email, phone, avatar_url, role, created_at;
    `;

    return rows[0];
  },

  verifyLoginInNeon: async (email, password) => {
    if (!sql) return null;
    const user = await module.exports.findUserByEmail(email);
    if (!user) return null;

    if (!user.password_hash) return null; // Google accounts sign in via Google

    const isMatch = await bcrypt.compare(password, user.password_hash);
    return isMatch ? user : null;
  },

  getAllUsers: async () => {
    if (!sql) return [];
    return await sql`SELECT id, name, email, phone, avatar_url, role, created_at FROM users ORDER BY created_at DESC;`;
  }
};
