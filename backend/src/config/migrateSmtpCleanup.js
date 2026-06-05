const db = require('./db');

async function migrate() {
  try {
    console.log('Cleaning up SMTP tables in PostgreSQL database...');

    // 1. Drop from smtp_configuration table if they exist
    await db.query('ALTER TABLE smtp_configuration DROP COLUMN IF EXISTS company_id');
    await db.query('ALTER TABLE smtp_configuration DROP COLUMN IF EXISTS companyid');
    await db.query('ALTER TABLE smtp_configuration DROP COLUMN IF EXISTS module_name');
    console.log('- Columns dropped successfully from smtp_configuration table (if they existed).');

    // 2. Drop from smtp_configs table if they exist
    try {
      await db.query('ALTER TABLE smtp_configs DROP COLUMN IF EXISTS company_id');
      await db.query('ALTER TABLE smtp_configs DROP COLUMN IF EXISTS companyid');
      await db.query('ALTER TABLE smtp_configs DROP COLUMN IF EXISTS module_name');
      console.log('- Columns dropped successfully from smtp_configs table (if they existed).');
    } catch (e) {
      console.log('- Note: smtp_configs table was not found or already cleaned in this database.');
    }

    console.log('SMTP cleanup migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup migration:', error);
    process.exit(1);
  }
}

migrate();
