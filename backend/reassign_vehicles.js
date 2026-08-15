const db = require('./src/config/db');

async function reassignAllVehicles() {
  try {
    const txs = await db.query("SELECT id, clientid, plate, tag_number FROM tbl_vehicle_toll_transaction");
    console.log(`Processing ${txs.rows.length} total toll records...`);

    const vehiclesRes = await db.query("SELECT vehicle_id, id, clientid, field_data FROM tbl_vehicle_details");
    console.log(`Loaded ${vehiclesRes.rows.length} vehicle records from tbl_vehicle_details.`);

    let matchedCount = 0;
    let nullCount = 0;

    for (const tx of txs.rows) {
      const cleanPlate = tx.plate ? String(tx.plate).trim().toLowerCase() : null;
      const cleanTag = tx.tag_number ? String(tx.tag_number).trim().toLowerCase() : null;

      // Ignore header/footer summary row like "TotalAmount(AED):"
      if (cleanPlate && (cleanPlate.includes('total') || cleanPlate.includes('amount'))) {
        await db.query("UPDATE tbl_vehicle_toll_transaction SET vehicle_id = NULL WHERE id = $1", [tx.id]);
        nullCount++;
        continue;
      }

      let matchedVehicleId = null;

      // Phase 1: Exact match against vehicle fields for this client
      for (const v of vehiclesRes.rows) {
        if (tx.clientid && String(v.clientid) !== String(tx.clientid)) continue;
        if (!v.field_data) continue;

        const vValues = Object.values(v.field_data).map(val => String(val).trim().toLowerCase());

        if (cleanPlate && vValues.includes(cleanPlate)) {
          matchedVehicleId = v.vehicle_id || v.id;
          break;
        }
        if (cleanTag && vValues.includes(cleanTag)) {
          matchedVehicleId = v.vehicle_id || v.id;
          break;
        }
      }

      // Phase 2: Suffix / Substring match (e.g. "AD 21772" vs "21772")
      if (!matchedVehicleId && cleanPlate && cleanPlate.length >= 3) {
        for (const v of vehiclesRes.rows) {
          if (tx.clientid && String(v.clientid) !== String(tx.clientid)) continue;
          if (!v.field_data) continue;

          const vValues = Object.values(v.field_data).map(val => String(val).trim().toLowerCase());
          const hasSuffixMatch = vValues.some(vVal => vVal.length >= 3 && (vVal.endsWith(cleanPlate) || cleanPlate.endsWith(vVal)));
          if (hasSuffixMatch) {
            matchedVehicleId = v.vehicle_id || v.id;
            break;
          }
        }
      }

      if (matchedVehicleId) {
        await db.query("UPDATE tbl_vehicle_toll_transaction SET vehicle_id = $1 WHERE id = $2", [matchedVehicleId, tx.id]);
        matchedCount++;
      } else {
        await db.query("UPDATE tbl_vehicle_toll_transaction SET vehicle_id = NULL WHERE id = $1", [tx.id]);
        nullCount++;
      }
    }

    console.log(`Finished: Matched ${matchedCount} toll transactions to vehicles. Unmatched/Null: ${nullCount}`);

    // Print summary breakdown of assigned vehicles
    const summary = await db.query("SELECT vehicle_id, COUNT(*) as cnt FROM tbl_vehicle_toll_transaction GROUP BY vehicle_id ORDER BY cnt DESC");
    console.log("Vehicle Assignment Summary:", summary.rows);

    process.exit(0);
  } catch (err) {
    console.error('Reassign error:', err);
    process.exit(1);
  }
}

reassignAllVehicles();
