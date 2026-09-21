require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const email = "cooker@hotpot.rw";
  const password = "CookerPassword2026!";
  const name = "Head Cooker & Chef";
  const role = "KITCHEN";
  const phone = "+250788765432";

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Check if user exists
  const existing = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email});`;

  if (existing.length > 0) {
    console.log("Updating existing cooker account in Neon DB...");
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, 
          role = ${role}, 
          name = ${name}, 
          phone = ${phone},
          updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email});
    `;
    console.log("Cooker updated successfully!");
  } else {
    console.log("Inserting new cooker account into Neon DB...");
    const id = `user-cooker-${Date.now()}`;
    await sql`
      INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at)
      VALUES (${id}, ${name}, ${email}, ${phone}, ${passwordHash}, ${role}, NOW(), NOW());
    `;
    console.log("Cooker inserted successfully!");
  }

  // Also create/update chef@hotpot.rw with a distinct phone
  const chefEmail = "chef@hotpot.rw";
  const chefPhone = "+250788765433";
  const existingChef = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${chefEmail});`;
  if (existingChef.length === 0) {
    const chefId = `user-chef-${Date.now()}`;
    await sql`
      INSERT INTO users (id, name, email, phone, password_hash, role, created_at, updated_at)
      VALUES (${chefId}, ${name}, ${chefEmail}, ${chefPhone}, ${passwordHash}, ${role}, NOW(), NOW());
    `;
    console.log("Chef alias inserted successfully!");
  } else {
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, 
          role = ${role}, 
          name = ${name}, 
          phone = ${chefPhone},
          updated_at = NOW()
      WHERE LOWER(email) = LOWER(${chefEmail});
    `;
    console.log("Chef alias updated successfully!");
  }

  // Verify directly using neonClient
  const neonClient = require('./neonClient');
  const user = await neonClient.verifyLoginInNeon(email, password);
  if (user && user.role === 'KITCHEN') {
    console.log("✅ VERIFICATION SUCCESSFUL: Cooker login verified in Neon database!");
    console.log("Details:", { id: user.id, name: user.name, email: user.email, role: user.role });
  } else {
    console.error("❌ VERIFICATION FAILED:", user);
  }

  const chefUser = await neonClient.verifyLoginInNeon(chefEmail, password);
  if (chefUser && chefUser.role === 'KITCHEN') {
    console.log("✅ VERIFICATION SUCCESSFUL: Chef login verified in Neon database!");
    console.log("Details:", { id: chefUser.id, name: chefUser.name, email: chefUser.email, role: chefUser.role });
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Error creating cooker:", err);
  process.exit(1);
});
