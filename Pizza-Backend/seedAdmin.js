require('dotenv').config();
const neonClient = require('./neonClient');

async function seedAdmin() {
  console.log("Creating sample admin account...");

  try {
    const adminData = {
      name: "Super Admin",
      email: "admin@hotpot.rw",
      phone: "+250788000000",
      password: "password123",
      role: "ADMIN"
    };

    // Check if exists
    const existing = await neonClient.findUserByEmail(adminData.email);
    if (existing) {
      console.log("Admin account already exists!");
      console.log(`Email: ${existing.email}`);
      console.log(`Role: ${existing.role}`);
      process.exit(0);
    }

    const newUser = await neonClient.registerUserInNeon(adminData);
    
    console.log("✅ Admin account created successfully!");
    console.log("--------------------------------------");
    console.log(`Name: ${newUser.name}`);
    console.log(`Email: ${newUser.email}`);
    console.log(`Password: ${adminData.password}`);
    console.log(`Role: ${newUser.role}`);
    console.log("--------------------------------------");
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create admin:", err);
    process.exit(1);
  }
}

seedAdmin();
