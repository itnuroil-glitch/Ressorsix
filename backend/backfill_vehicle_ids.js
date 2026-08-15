const db = require('./src/config/db');

async function backfill() {
  try {
    const txs = await db.query("SELECT id, clientid, plate, tag_number, vehicle_id FROM tbl_vehicle_toll_transaction WHERE vehicle_id IS NULL");
    console.log(`Found ${txs.rows.length} toll records with NULL vehicle_id`);

    const vehiclesRes = await db.query("SELECT vehicle_id, id, clientid, field_data FROM tbl_vehicle_details");
    console.log(`Loaded ${vehiclesRes.rows.length} vehicle records from tbl_vehicle_details`);

    let updatedCount = 0;

    for (const tx of txs.rows) {
      const searchTerms = [];
      if (tx.plate && String(tx.plate).trim() !== '') searchTerms.push(String(tx.plate).trim().toLowerCase());
      if (tx.tag_number && String(tx.tag_number).trim() !== '') searchTerms.push(String(tx.tag_number).trim().toLowerCase());

      if (searchTerms.length === 0) continue;

      let matchedVehicleId = null;

      for (const v of vehiclesRes.rows) {
        if (tx.clientid && String(v.clientid) !== String(tx.clientid)) continue;

        if (v.field_data) {
          const vehicleValues = Object.values(v.field_data)
            .map(val => String(val).trim().toLowerCase())
            .filter(val => val.length > 0);

          const hasMatch = searchTerms.some(term => vehicleValues.some(vVal => vVal === term || vVal.includes(term) || term.includes(vVal)));
          if (hasMatch) {
            matchedVehicleId = v.vehicle_id || v.id;
            break;
          }
        }
      }

      if (matchedVehicleId) {
        await db.query("UPDATE tbl_vehicle_toll_transaction SET vehicle_id = $1 WHERE id = $2", [matchedVehicleId, tx.id]);
        updatedCount++;
      }
    }

    console.log(`Successfully backfilled vehicle_id for ${updatedCount} toll transaction rows.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill error:', err);
    process.exit(1);
  }
}

backfill();
