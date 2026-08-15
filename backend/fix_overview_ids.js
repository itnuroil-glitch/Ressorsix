const db = require('./src/config/db');

async function fixOverviewJsonFieldIds() {
  console.log("Fixing JSON field IDs for tbl_toll_overview...");

  const res = await db.query("SELECT id, field_data FROM tbl_toll_overview");
  for (const r of res.rows) {
    let fd = r.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e){}
    }

    const tollName = fd['Toll Name'] || fd['Toll Name '] || fd['toll_name'] || fd['1786629185586'] || 'Salik';
    const accNo = fd['Account No'] || fd['ACCOUNT NO'] || fd['account_no'] || fd['1786629206891'] || '34866829';

    // Map BOTH field IDs and text keys!
    fd['1786629185586'] = tollName;
    fd['1786629206891'] = accNo;
    fd['Toll Name'] = tollName;
    fd['Account No'] = accNo;

    await db.query("UPDATE tbl_toll_overview SET field_data = $1 WHERE id = $2", [JSON.stringify(fd), r.id]);
    console.log(`Updated Record #${r.id}: Toll Name -> ${tollName}, Account No -> ${accNo}`);
  }

  process.exit(0);
}

fixOverviewJsonFieldIds().catch(console.error);
