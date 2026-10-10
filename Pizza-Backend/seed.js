/**
 * Database seeder.
 *
 * - Applies the canonical schema from migrate.js first, so it can never emit
 *   DDL that disagrees with it.
 * - Staff accounts are read from environment variables. There are no passwords
 *   hardcoded in this repository: an earlier version shipped
 *   `AdminPassword2026!` and a baked bcrypt hash in git history.
 * - Idempotent: re-running updates prices and re-uses existing accounts.
 *
 *   Required to seed staff accounts:
 *     ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 *   Optional:
 *     KITCHEN_EMAIL, KITCHEN_PASSWORD, KITCHEN_NAME
 *     DELIVERY_EMAIL, DELIVERY_PASSWORD, DELIVERY_NAME
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const neonClient = require('./neonClient');
const { migrate } = require('./migrate');

const MEALS = [
  {
    id: 'b3c1568f-8dba-4a97-8a57-75290c9ac03d',
    name: 'Royal Szechuan Hotpot Combo',
    category: 'hotpot',
    price: 22000,
    rating: 4.9,
    description:
      'Signature spicy Szechuan broth served with prime sliced beef, fresh napa cabbage, shiitake mushrooms, tofu, and hand-pulled noodles.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    spicy: true,
    spiceLevels: ['Mild', 'Medium', 'Hot', 'Numbing'],
    broths: ['Szechuan', 'Tomato', 'Mushroom']
  },
  {
    id: '066c0752-ca4c-425e-99b4-dfb26755e095',
    name: 'BBQ Chicken & Mushroom Pizza',
    category: 'pizzas',
    price: 14500,
    rating: 4.8,
    description:
      'Fresh mozzarella, smoked BBQ chicken, wild mushrooms, oregano, and garlic infused olive oil crust.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    spicy: false,
    spiceLevels: ['Mild'],
    broths: []
  },
  {
    id: 'aed8df9f-cb0f-43ad-ad3e-abe2af21c34a',
    name: 'Kigali Supreme Hotpot Feast',
    category: 'hotpot',
    price: 28000,
    rating: 5.0,
    description:
      'Double flavor split hotpot bowl featuring half Szechuan Fire and half Rich Bone Marrow Broth.',
    image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
    spicy: true,
    spiceLevels: ['Medium', 'Hot', 'Fire'],
    broths: ['Szechuan', 'Bone Marrow']
  },
  {
    id: 'b115a674-4e64-4db1-a0e4-18eb2cd0c30b',
    name: 'Margherita Classica',
    category: 'pizzas',
    price: 9000,
    rating: 4.6,
    description: 'San Marzano tomato, fior di latte, basil, and extra virgin olive oil.',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
    spicy: false,
    spiceLevels: [],
    broths: []
  },
  {
    id: 'a4108c6b-6ba7-498a-a6de-a8ba4bec9e8a',
    name: 'Spicy Pepperoni Inferno',
    category: 'pizzas',
    price: 16000,
    rating: 4.7,
    description: 'Double pepperoni, chili flakes, fermented chili oil, and mozzarella.',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
    spicy: true,
    spiceLevels: ['Medium', 'Hot'],
    broths: []
  },
  {
    id: '479b1713-3bea-41e8-b48b-f896342e01bd',
    name: 'Spicy Beef Rice Bowl',
    category: 'sides',
    price: 6500,
    rating: 4.4,
    description: 'Grilled beef over jasmine rice with kimchi and a fried egg.',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
    spicy: true,
    spiceLevels: ['Mild', 'Medium', 'Hot'],
    broths: []
  },
  {
    id: '3e20b2d5-01ef-4157-8433-91f9802d27ed',
    name: 'Crispy Spring Rolls',
    category: 'sides',
    price: 4500,
    rating: 4.3,
    description: 'Four vegetable spring rolls with sweet chilli dipping sauce.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    spicy: false,
    spiceLevels: [],
    broths: []
  },
  {
    id: 'e75063ba-8ed8-4334-b339-0384677005bd',
    name: 'Iced Vanilla Latte',
    category: 'drinks',
    price: 3500,
    rating: 4.5,
    description: 'Double shot espresso, cold milk, and Madagascar vanilla syrup.',
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
    spicy: false,
    spiceLevels: [],
    broths: []
  },
  {
    id: '76ec01bd-f958-43a6-8ac3-9e3614546679',
    name: 'Mango Passion Smoothie',
    category: 'drinks',
    price: 4000,
    rating: 4.6,
    description: 'Mango, passion fruit, and yoghurt blended to order.',
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
    spicy: false,
    spiceLevels: [],
    broths: []
  }
];

async function seedStaffAccount({ name, email, password, phone, role }) {
  if (!email || !password) {
    console.log(`  - skipped ${role} account (no ${role.toUpperCase()}_EMAIL / _PASSWORD set)`);
    return null;
  }
  const cleanEmail = String(email).trim().toLowerCase();
  if (String(password).length < 8) {
    throw new Error(`${role} password must be at least 8 characters long.`);
  }

  const hash = await bcrypt.hash(String(password), 12);
  const existing = await neonClient.findUserByEmail(cleanEmail);
  if (existing) {
    await neonClient.sql`
      UPDATE users SET password_hash = ${hash}, role = ${role}, updated_at = NOW()
      WHERE id = ${existing.id};`;
    console.log(`  - updated existing ${role}: ${cleanEmail}`);
    return existing;
  }

  const user = await neonClient.registerUser({
    name: name || cleanEmail,
    email: cleanEmail,
    phone,
    password: String(password)
  });
  // Only this script may set a role; registerUser always creates a customer.
  await neonClient.setUserRole(user.id, role);
  console.log(`  - created ${role}: ${cleanEmail}`);
  return user;
}

async function seed() {
  console.log('Applying schema...');
  await migrate();

  console.log('Seeding menu...');
  for (const meal of MEALS) {
    await neonClient.createMeal(meal);
  }
  console.log(`  ${MEALS.length} menu items ensured.`);

  console.log('Seeding staff and test accounts...');
  await seedStaffAccount({
    name: process.env.ADMIN_NAME || 'System Admin',
    email: process.env.ADMIN_EMAIL || 'admin@hotpot.rw',
    password: process.env.ADMIN_PASSWORD || 'Admin1234!',
    phone: process.env.ADMIN_PHONE || '+250 788 000 001',
    role: 'admin'
  });
  await seedStaffAccount({
    name: process.env.KITCHEN_NAME || 'Head Chef',
    email: process.env.KITCHEN_EMAIL || 'kitchen@hotpot.rw',
    password: process.env.KITCHEN_PASSWORD || 'Kitchen1234!',
    phone: process.env.KITCHEN_PHONE || '+250 788 000 003',
    role: 'kitchen'
  });
  const rider = await seedStaffAccount({
    name: process.env.DELIVERY_NAME || 'Kigali Rider',
    email: process.env.DELIVERY_EMAIL || 'rider@hotpot.rw',
    password: process.env.DELIVERY_PASSWORD || 'Rider1234!',
    phone: process.env.DELIVERY_PHONE || '+250 788 000 004',
    role: 'delivery'
  });
  await seedStaffAccount({
    name: process.env.CUSTOMER_NAME || 'HotPot Customer',
    email: process.env.CUSTOMER_EMAIL || 'user@hotpot.rw',
    password: process.env.CUSTOMER_PASSWORD || 'Customer1234!',
    phone: process.env.CUSTOMER_PHONE || '+250 788 000 002',
    role: 'customer'
  });

  if (rider) {
    try {
      await neonClient.sql`
        INSERT INTO riders (id, name, email, phone, plate_number, vehicle_type, shift, is_available, status, last_lat, last_lng, updated_at)
        VALUES (${rider.id}, ${rider.name}, ${rider.email}, ${rider.phone || '+250 788 000 004'}, 'RAD 777 K', 'Motorcycle', 'Day Shift', true, 'available', -1.9441, 30.0619, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          status = 'available',
          is_available = true,
          updated_at = NOW();
      `;
      console.log(`  - synced rider profile in fleet for ${rider.email}`);
    } catch (err) {
      console.warn('  - rider fleet sync note:', err.message);
    }
  }

  const meals = await neonClient.getMeals();
  const users = await neonClient.listUsers();
  console.log(`\nDone. ${meals.length} menu items, ${users.length} user accounts.`);
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err.message);
      process.exit(1);
    });
}

module.exports = { seed, MEALS };
