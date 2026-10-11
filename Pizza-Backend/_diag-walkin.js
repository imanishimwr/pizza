require('dotenv').config();
const neonClient = require('./neonClient');

(async () => {
  try {
    const order = await neonClient.createWalkInOrder({
      customerName: 'Direct Tester',
      phone: '0788000111',
      items: [{ mealId: 'meal-1789894252038', name: 'Kigali Volcano Pizza', price: 18000, qty: 1 }]
    });
    console.log('SUCCESS:', JSON.stringify(order, null, 2));
  } catch (e) {
    console.error('FAILED:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
})();