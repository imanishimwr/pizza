require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function test() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  
  try {
    // Check tables
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables in DB:', tables.map(t => t.table_name));
    
    // Check meals
    const meals = await sql`SELECT * FROM meals LIMIT 5`;
    console.log('Meals count:', meals.length);
    console.log('Meals data:', JSON.stringify(meals, null, 2));
    
    // Check users
    const users = await sql`SELECT id, name, email, role FROM users LIMIT 5`;
    console.log('Users:', JSON.stringify(users, null, 2));
    
  } catch (err) {
    console.error('DB Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

test();
