const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function main() {
  try {
    await pool.query('ALTER TABLE tbl_vehicle_details ADD COLUMN IF NOT EXISTS roleid INTEGER;');
    console.log('Successfully added roleid to tbl_vehicle_details');
  } catch (err) {
    console.error('Error adding roleid:', err);
  } finally {
    pool.end();
  }
}

main();
