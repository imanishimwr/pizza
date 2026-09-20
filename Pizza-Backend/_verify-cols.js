require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const cols = await sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('orders','order_items') ORDER BY table_name, ordinal_position;`;
  console.log(cols.map(c => c.table_name + '.' + c.column_name).join('\n'));
})().catch(e => console.log('ERR', e.message));