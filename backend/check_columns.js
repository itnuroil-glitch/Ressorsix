require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    for (const tableName of ['tbl_vehicle_insurance', 'tbl_vehicle_purchase', 'tbl_vehicle_details']) {
      const res = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
      `);
      console.log(`Columns of ${tableName}:`, res.rows.map(r => r.column_name));
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
