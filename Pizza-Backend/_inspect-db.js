const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log('NO_DB_URL'); process.exit(0); }
  const sql = neon(url);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`;
  console.log('TABLES:', tables.map(t => t.table_name).join(', '));
  const targets = ['users', 'meals', 'orders', 'order_items', 'vouchers'];
  for (const t of tables) {
    if (targets.includes(t.table_name)) {
      const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${t.table_name} ORDER BY ordinal_position;`;
      console.log(t.table_name + ':', cols.map(c => c.column_name).join(', '));
    }
  }
  const cnt = await sql`SELECT (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM meals) AS meals;`;
  console.log('COUNTS:', JSON.stringify(cnt[0]));
})().catch(e => { console.log('ERR', e.message); process.exit(1); });