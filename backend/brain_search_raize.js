require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');

async function searchRaize() {
  try {
    const vdRes = await db.query(`
      SELECT id, vehicle_id, clientid, field_data 
      FROM tbl_vehicle_details
    `);
    console.log("tbl_vehicle_details records containing Raize:");
    vdRes.rows.forEach(r => {
      const str = JSON.stringify(r.field_data);
      if (str.toLowerCase().includes('raize')) {
        console.log(`ID: ${r.id}, VehicleID: ${r.vehicle_id}, ClientID: ${r.clientid}`);
        console.log("field_data:", JSON.stringify(r.field_data, null, 2));
      }
    });

    const viRes = await db.query(`
      SELECT id, vehicle_id, clientid, field_data 
      FROM tbl_vehicle_insurance
    `);
    console.log("\ntbl_vehicle_insurance records containing Raize:");
    viRes.rows.forEach(r => {
      const str = JSON.stringify(r.field_data);
      if (str.toLowerCase().includes('raize')) {
        console.log(`ID: ${r.id}, VehicleID: ${r.vehicle_id}, ClientID: ${r.clientid}`);
        console.log("field_data:", JSON.stringify(r.field_data, null, 2));
      }
    });

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
searchRaize();
