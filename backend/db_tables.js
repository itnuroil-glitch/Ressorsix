require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_vehicle_details'
    `);
    console.log("tbl_vehicle_details Columns:", res.rows);
    
    const data = await db.query(`
      SELECT * FROM tbl_vehicle_details LIMIT 3
    `);
    console.log("tbl_vehicle_details Data:", data.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
