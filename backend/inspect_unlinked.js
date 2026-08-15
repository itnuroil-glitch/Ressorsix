const db = require('./src/config/db');

async function inspect() {
  const nullTolls = await db.query("SELECT id, plate, tag_number, clientid, company_id FROM tbl_vehicle_toll_transaction WHERE vehicle_id IS NULL");
  console.log('Toll transactions with NULL vehicle_id:', nullTolls.rows);

  const vehicleDetails = await db.query("SELECT vehicle_id, id, clientid, company_id, field_data FROM tbl_vehicle_details");
  console.log('Vehicle details count:', vehicleDetails.rows.length);
  vehicleDetails.rows.forEach(v => {
    console.log(`Vehicle ID: ${v.vehicle_id || v.id}, Client: ${v.clientid}, Fields:`, JSON.stringify(v.field_data));
  });

  const tollPlates = await db.query("SELECT DISTINCT plate, vehicle_id FROM tbl_vehicle_toll_transaction");
  console.log('Distinct toll plates & vehicle_ids:', tollPlates.rows);

  process.exit(0);
}

inspect().catch(console.error);
