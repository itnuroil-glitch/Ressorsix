const db = require('./src/config/db');

async function main() {
  try {
    await db.query('ALTER TABLE tbl_vehicle_purchase ADD COLUMN IF NOT EXISTS roleid INTEGER;');
    await db.query('ALTER TABLE tbl_vehicle_purchase ADD COLUMN IF NOT EXISTS user_id INTEGER;');
    console.log('Successfully added roleid and user_id to tbl_vehicle_purchase');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    process.exit();
  }
}

main();
