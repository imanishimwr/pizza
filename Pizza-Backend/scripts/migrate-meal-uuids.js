const crypto = require('crypto');
const { sql, getMeals } = require('../database');

function isUuid(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

async function run() {
  console.log('Checking meals for non-UUID IDs...');
  const meals = await getMeals();
  console.log(`Found ${meals.length} meals in database.`);

  let updatedCount = 0;
  for (const meal of meals) {
    if (!isUuid(meal.id)) {
      const newUuid = crypto.randomUUID();
      console.log(`Migrating meal "${meal.name}" from "${meal.id}" -> "${newUuid}"`);
      
      // Update order_items that reference old ID
      await sql`UPDATE order_items SET meal_id = ${newUuid} WHERE meal_id = ${meal.id};`;
      // Update meals primary key
      await sql`UPDATE meals SET id = ${newUuid}, updated_at = NOW() WHERE id = ${meal.id};`;
      updatedCount++;
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} meals to UUIDs.`);
  const fresh = await getMeals();
  console.log('Current meals in database:');
  for (const m of fresh) {
    console.log(`- ${m.name} -> ${m.id} (isUuid: ${isUuid(m.id)})`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
