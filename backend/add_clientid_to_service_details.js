const db = require('./src/config/db');

async function addClientIdColumn() {
  try {
    await db.query(`
      ALTER TABLE tbl_service_details 
      ADD COLUMN IF NOT EXISTS clientid INTEGER,
      ADD COLUMN IF NOT EXISTS client_id INTEGER;
    `);
    console.log('Successfully added clientid / client_id columns to tbl_service_details');
  } catch (err) {
    console.error('Error adding clientid column:', err);
  } finally {
    process.exit();
  }
}

addClientIdColumn();
