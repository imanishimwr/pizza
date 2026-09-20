require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const email = "admin@hotpot.rw";
  const password = "AdminPassword2026!";
  const name = "System Administrator";
  const role = "ADMIN";
  const phone = "+250788123456";

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Check if user exists
  const existing = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email});`;

  if (existing.length > 0) {
    console.log("Updating existing admin account...");
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, 
          role = ${role}, 
          name = ${name}, 
          phone = ${phone},
          updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email});
    `;
    console.log("Admin updated successfully!");
  } else {
    console.log("Inserting new admin account...");
    const id = `user-${Date.now()}`;
    await sql`
      INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at)
      VALUES (${id}, ${name}, ${email}, ${phone}, ${passwordHash}, ${role}, NOW(), NOW());
    `;
    console.log("Admin inserted successfully!");
  }

  // Verify directly
  const neonClient = require('./neonClient');
  const user = await neonClient.verifyLoginInNeon(email, password);
  if (user && user.role === 'ADMIN') {
    console.log("✅ VERIFICATION SUCCESSFUL: Admin login verified in database!");
    console.log("Details:", { id: user.id, name: user.name, email: user.email, role: user.role });
  } else {
    console.error("❌ VERIFICATION FAILED:", user);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Error creating admin:", err);
  process.exit(1);
});
