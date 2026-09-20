require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  const users = await sql`SELECT id, name, email, role FROM users ORDER BY created_at DESC`;
  console.log('=== USERS (' + users.length + ') ===');
  users.forEach(u => console.log(`  ${u.role} | ${u.email} | ${u.name}`));

  const meals = await sql`SELECT id, name, category, price FROM meals`;
  console.log('\n=== MEALS (' + meals.length + ') ===');
  meals.forEach(m => console.log(`  ${m.category} | ${m.name} | ${m.price} RWF`));

  const orders = await sql`SELECT id, status, "customerName" FROM orders`;
  console.log('\n=== ORDERS (' + orders.length + ') ===');
  orders.forEach(o => console.log(`  ${o.id} | ${o.status} | ${o.customerName}`));

  // Check table columns
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_items' ORDER BY ordinal_position`;
  console.log('\n=== ORDER_ITEMS COLUMNS ===');
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
})().catch(e => console.error('ERROR:', e.message));
