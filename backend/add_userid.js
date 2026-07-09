const db = require('./src/config/db');

async function main() {
  try {
    await db.query('ALTER TABLE tbl_vehicle_details ADD COLUMN IF NOT EXISTS user_id INTEGER;');
    console.log('Successfully added user_id to tbl_vehicle_details');
  } catch (err) {
    console.error('Error adding user_id:', err);
  } finally {
    process.exit();
  }
}

main();
