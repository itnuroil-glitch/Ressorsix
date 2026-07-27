const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Seeding Trakio database with a default user...');
    
    // 1. Clear any existing demo users
    await db.query('DELETE FROM users WHERE email = $1', ['john.smith@email.com']);
    
    // 2. Hash password
    const password = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 3. Insert user
    const insertQuery = `
      INSERT INTO users (email, password, roleid)
      VALUES ($1, $2, $3)
      RETURNING id, email, roleid, created_at
    `;
    const result = await db.query(insertQuery, ['john.smith@email.com', hashedPassword, '1']);
    
    console.log('Database seeded successfully!');
    console.log('Created User:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
