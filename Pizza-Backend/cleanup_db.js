require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  console.log('=== Cleaning up test/junk data from Neon DB ===\n');

  // Remove test orders (created with test data)
  const testOrders = await sql`DELETE FROM order_items WHERE "orderId" LIKE 'order-%' RETURNING id`;
  console.log(`Deleted ${testOrders.length} test order items`);

  const deletedOrders = await sql`DELETE FROM orders WHERE id LIKE 'order-%' RETURNING id`;
  console.log(`Deleted ${deletedOrders.length} test orders`);

  // Remove junk meals (test entries with weird names/prices)
  const junkMeals = await sql`DELETE FROM meals WHERE name IN ('Pizza', 'Test Meal API', 'Lewis') RETURNING id, name`;
  console.log(`Deleted ${junkMeals.length} junk meals:`, junkMeals.map(m => m.name).join(', '));

  // Remove test customer accounts (auto-generated test accounts)
  const testUsers = await sql`DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%1789%' RETURNING email`;
  console.log(`Deleted ${testUsers.length} test user accounts:`, testUsers.map(u => u.email).join(', '));

  // Show clean state
  console.log('\n=== Clean Database State ===');
  const users = await sql`SELECT id, name, email, role FROM users ORDER BY role, created_at`;
  console.log('\nUsers:');
  users.forEach(u => console.log(`  [${u.role}] ${u.name} (${u.email})`));

  const meals = await sql`SELECT id, name, category, price FROM meals ORDER BY category, name`;
  console.log(`\nMeals (${meals.length}):`);
  meals.forEach(m => console.log(`  [${m.category}] ${m.name} - ${m.price} RWF`));

  const orders = await sql`SELECT id, status, "customerName" FROM orders`;
  console.log(`\nOrders (${orders.length}):`);
  orders.forEach(o => console.log(`  ${o.id} | ${o.status} | ${o.customerName}`));

  console.log('\n✅ Database cleanup complete!');
})().catch(e => console.error('ERROR:', e.message));
