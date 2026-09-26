require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.DATABASE_URL);

(async () => {
  const users = await sql`SELECT id, name, email, role, phone, password_hash, created_at FROM users WHERE role = 'KITCHEN' OR email LIKE '%cook%' OR email LIKE '%chef%' OR email LIKE '%kitchen%'`;
  
  console.log('Found', users.length, 'cook accounts in Neon PostgreSQL:');
  for (const u of users) {
    const isPw123 = u.password_hash ? await bcrypt.compare('password123', u.password_hash) : false;
    const isCooker123 = u.password_hash ? await bcrypt.compare('cooker123', u.password_hash) : false;
    const isChef123 = u.password_hash ? await bcrypt.compare('chef123', u.password_hash) : false;
    const isAdmin123 = u.password_hash ? await bcrypt.compare('admin123', u.password_hash) : false;

    console.log({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      password_matches: isPw123 ? 'password123' : isCooker123 ? 'cooker123' : isChef123 ? 'chef123' : isAdmin123 ? 'admin123' : 'custom_hash',
      created_at: u.created_at
    });
  }
})().catch(console.error);
