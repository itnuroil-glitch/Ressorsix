const db = require('./src/config/db');

async function backfillOverviewAccountNo() {
  console.log("Updating tbl_toll_overview records with sample Account Numbers...");
  
  const res = await db.query("SELECT id, field_data FROM tbl_toll_overview");
  for (const row of res.rows) {
    let fd = row.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e) {}
    }

    const tollName = fd['1786629185586'] || fd['Toll Name'] || fd['toll_name'] || 'Salik';
    const accNo = tollName.toLowerCase().includes('darb') ? '10892241' : '34866829';

    fd['Account No'] = fd['Account No'] || fd['ACCOUNT NO'] || fd['1786629206891'] || accNo;
    fd['1786629206891'] = fd['1786629206891'] || accNo;

    await db.query("UPDATE tbl_toll_overview SET field_data = $1 WHERE id = $2", [JSON.stringify(fd), row.id]);
    console.log(`Updated Overview #${row.id} (${tollName}) -> Account No: ${fd['Account No']}`);
  }

  // Also update tbl_vehicle_toll
  const res2 = await db.query("SELECT id, field_data FROM tbl_vehicle_toll");
  for (const row of res2.rows) {
    let fd = row.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e) {}
    }

    const tollName = fd['1786629185586'] || fd['Toll Name'] || fd['toll_name'] || 'Salik';
    const accNo = tollName.toLowerCase().includes('darb') ? '10892241' : '34866829';

    fd['Account No'] = fd['Account No'] || fd['ACCOUNT NO'] || fd['1786629206891'] || accNo;
    fd['1786629206891'] = fd['1786629206891'] || accNo;

    await db.query("UPDATE tbl_vehicle_toll SET field_data = $1 WHERE id = $2", [JSON.stringify(fd), row.id]);
  }

  process.exit(0);
}

backfillOverviewAccountNo().catch(console.error);
