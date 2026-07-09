const db = require('./src/db'); // assuming db.js is in src/

async function main() {
  try {
    await db.query('ALTER TABLE tbl_vehicle_details ADD COLUMN IF NOT EXISTS roleid INTEGER;');
    console.log('Successfully added roleid to tbl_vehicle_details');
  } catch (err) {
    console.error('Error adding roleid:', err);
  } finally {
    process.exit();
  }
}

main();
