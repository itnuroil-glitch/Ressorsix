const db = require('./src/config/db');

async function checkPlates() {
  const tollPlates = await db.query("SELECT DISTINCT plate, COUNT(*) as tx_count FROM tbl_vehicle_toll_transaction GROUP BY plate");
  console.log("Distinct Plates in Toll Transactions:", tollPlates.rows);

  const vehiclePlates = await db.query("SELECT vehicle_id, id, clientid, field_data FROM tbl_vehicle_details WHERE clientid = 16");
  console.log("Vehicles registered for Client 16:");
  vehiclePlates.rows.forEach(v => {
    console.log(`Vehicle ID: ${v.vehicle_id || v.id} -> Fields:`, JSON.stringify(v.field_data));
  });

  process.exit(0);
}

checkPlates().catch(console.error);
