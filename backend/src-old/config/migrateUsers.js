const db = require('./db');

async function migrate() {
  try {
    console.log('Migrating users table in PostgreSQL database...');

    // 1. Add status column
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS status INTEGER DEFAULT 1');
    console.log('- status column added successfully.');

    // 2. Add isdelete column
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS isdelete BOOLEAN DEFAULT false');
    console.log('- isdelete column added successfully.');

    // 3. Add clientid column
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS clientid INTEGER');
    console.log('- clientid column added successfully.');

    // 4. Add companyid column
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS companyid INTEGER');
    console.log('- companyid column added successfully.');

    // 5. Add roleid column
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS roleid INTEGER');
    console.log('- roleid column added successfully.');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
