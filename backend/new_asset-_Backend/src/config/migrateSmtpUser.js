const db = require('./db');

async function migrate() {
  try {
    console.log('Migrating smtp_configuration table in PostgreSQL database...');

    // Add userid column
    await db.query('ALTER TABLE smtp_configuration ADD COLUMN IF NOT EXISTS userid INTEGER');
    console.log('- userid column added successfully to smtp_configuration table.');

    console.log('SMTP Configuration migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
