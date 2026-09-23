require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function checkTable(t, cols) {
  const res = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name=${t} ORDER BY ordinal_position;
  `;
  const names = res.map(c => c.column_name);
  const missing = cols.filter(c => !names.includes(c));
  console.log(`${t.padEnd(14)} ${res.length} cols | missing: ${missing.length ? missing.join(',') : 'none'}`);
}

(async () => {
  console.log('=== CONNECTIVITY ===');
  await sql`SELECT 1;`;
  console.log('DB connection OK');

  console.log('\n=== TABLES ===');
  const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;`;
  console.log(t.map(x => x.table_name).join(', '));

  console.log('\n=== SCHEMA CHECK ===');
  await checkTable('users', ['id','name','email','phone','password_hash','google_id','avatar_url','role','created_at','updated_at']);
  await checkTable('meals', ['id','name','category','price','rating','description','image','spicy','outOfStock']);
  await checkTable('orders', ['id','customerName','phone','address','lat','lng','status','totalRWF','riderName','paymentType','paymentStatus','created_at']);
  await checkTable('order_items', ['id','orderId','mealId','name','qty','price','spice','broth','specialNote']);
  await checkTable('categories', ['id','name','icon','sortOrder','active']);
  await checkTable('promos', ['id','title','subtitle','code','tag','color','bgGradient','active','sortOrder']);
  await checkTable('vouchers', ['id','code','discountAmount','description','active']);

  console.log('\n=== RECENT ORDERS ===');
  const orders = await sql`SELECT id, "customerName", status, "totalRWF", created_at FROM orders ORDER BY created_at DESC LIMIT 5;`;
  console.log(JSON.stringify(orders, null, 1));

  console.log('\n=== COUNTS ===');
  const c = await sql`SELECT (SELECT COUNT(*) FROM users) u,(SELECT COUNT(*) FROM meals) m,(SELECT COUNT(*) FROM categories) cat,(SELECT COUNT(*) FROM promos) p,(SELECT COUNT(*) FROM orders) o,(SELECT COUNT(*) FROM order_items) oi,(SELECT COUNT(*) FROM vouchers) v;`;
  console.log(JSON.stringify(c[0]));

  console.log('\n=== MEALS SAMPLE ===');
  const meals = await sql`SELECT id, name, category, price, spicy, "outOfStock" FROM meals ORDER BY created_at DESC LIMIT 12;`;
  console.log(JSON.stringify(meals, null, 1));

  console.log('\n=== CATEGORIES / PROMOS ===');
  const cats = await sql`SELECT id, name, active FROM categories ORDER BY "sortOrder";`;
  const promos = await sql`SELECT code, title, active FROM promos ORDER BY "sortOrder";`;
  console.log('cats:', JSON.stringify(cats));
  console.log('promos:', JSON.stringify(promos));

  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });