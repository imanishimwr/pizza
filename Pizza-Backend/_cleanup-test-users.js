require('dotenv').config();
const client = require('./neonClient');

(async () => {
  if (!client.sql) throw new Error('DATABASE_URL is not configured');

  await client.sql`
    UPDATE orders
    SET "userId" = NULL
    WHERE "userId" IN (
      SELECT id FROM users WHERE LOWER(email) IN ('testcustomer_1789901981447@gmail.com', 'user.google@hotpot.com', 'admin@hotpot.rw')
    );
  `;

  const deleted = await client.sql`
    DELETE FROM users
    WHERE LOWER(email) IN ('testcustomer_1789901981447@gmail.com', 'user.google@hotpot.com', 'admin@hotpot.rw')
    RETURNING id, email, role;
  `;

  console.log(JSON.stringify(deleted, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
