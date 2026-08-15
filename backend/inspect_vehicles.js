const db = require('./src/config/db');
async function run() {
  const cols = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tbl_vehicle_details'");
  console.log('tbl_vehicle_details Columns:', cols.rows);
  const sample = await db.query("SELECT * FROM tbl_vehicle_details LIMIT 5");
  console.log('Sample vehicles:', sample.rows);
  process.exit(0);
}
run().catch(console.error);
