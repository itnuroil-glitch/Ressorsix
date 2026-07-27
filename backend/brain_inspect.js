require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');

async function checkVehicles() {
  try {
    const res = await db.query(`
      SELECT id, vehicle_id, clientid, field_data 
      FROM tbl_vehicle_details
    `);
    console.log("ALL VEHICLE DETAILS ROWS:");
    res.rows.forEach(r => {
      console.log(`ID: ${r.id}, VehicleID: ${r.vehicle_id}, ClientID: ${r.clientid}`);
      console.log("field_data:", JSON.stringify(r.field_data, null, 2));
    });

    const customFields = await db.query(`
      SELECT field_id, field_name, custom_fieldsid
      FROM tbl_customfield_details
      WHERE LOWER(field_name) LIKE '%vehicle%'
    `);
    console.log("\nCUSTOM FIELDS MATCHING 'vehicle':");
    console.log(customFields.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkVehicles();
