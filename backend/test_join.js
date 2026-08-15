const db = require('./src/config/db');

async function testJoinDynamic() {
  const vehiclesRes = await db.query("SELECT vehicle_id, id, clientid, field_data FROM tbl_vehicle_details");
  console.log(`Loaded ${vehiclesRes.rows.length} vehicle records.`);

  const txs = await db.query("SELECT id, vehicle_id, plate, tag_number, clientid FROM tbl_vehicle_toll_transaction LIMIT 20");

  for (const tx of txs.rows) {
    const cleanPlate = tx.plate ? String(tx.plate).trim().toLowerCase() : '';
    const cleanTag = tx.tag_number ? String(tx.tag_number).trim().toLowerCase() : '';

    let matchedVehicle = null;

    // 1. Match by vehicle_id
    if (tx.vehicle_id) {
      matchedVehicle = vehiclesRes.rows.find(v => (v.vehicle_id && String(v.vehicle_id) === String(tx.vehicle_id)) || String(v.id) === String(tx.vehicle_id));
    }

    // 2. Match by plate or tag
    if (!matchedVehicle && (cleanPlate || cleanTag)) {
      matchedVehicle = vehiclesRes.rows.find(v => {
        if (!v.field_data) return false;
        const vals = Object.values(v.field_data).map(val => String(val).trim().toLowerCase());
        return (cleanPlate && vals.includes(cleanPlate)) || (cleanTag && vals.includes(cleanTag));
      });
    }

    let vehicleName = 'Unassigned';
    if (matchedVehicle && matchedVehicle.field_data) {
      // Key '1780558935557' is vehicle name/model, or pick first non-plate field
      const fd = matchedVehicle.field_data;
      vehicleName = fd['1780558935557'] || Object.values(fd)[0] || `Vehicle #${matchedVehicle.vehicle_id || matchedVehicle.id}`;
    }

    console.log(`TX #${tx.id} | Plate: ${tx.plate || 'N/A'} | Tag: ${tx.tag_number || 'N/A'} | Vehicle Name: ${vehicleName}`);
  }
  process.exit(0);
}

testJoinDynamic().catch(console.error);
