const db = require('./src/config/db');

async function cleanJsonSchema() {
  console.log("Cleaning and standardizing JSON field_data in PostgreSQL...");

  // 1. Clean tbl_toll_overview
  const res1 = await db.query("SELECT id, field_data FROM tbl_toll_overview");
  for (const r of res1.rows) {
    let fd = r.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e){}
    }

    const tollName = String(fd['1786629185586'] || fd['Toll Name'] || fd['toll_name'] || (r.id === 1 ? 'Darb' : 'Salik')).trim();
    const accNo = String(fd['1786629206891'] || fd['Account No'] || fd['ACCOUNT NO'] || fd['account_no'] || (r.id === 1 ? '7821989' : '34866829')).trim();

    const cleanFd = {
      "1786629185586": tollName,
      "1786629206891": accNo,
      "Toll Name": tollName,
      "Account No": accNo,
      "toll_name": tollName,
      "account_no": accNo
    };

    await db.query("UPDATE tbl_toll_overview SET field_data = $1 WHERE id = $2", [JSON.stringify(cleanFd), r.id]);
    console.log(`Overview #${r.id} updated ->`, cleanFd);
  }

  // 2. Clean tbl_vehicle_toll if present
  const res2 = await db.query("SELECT id, field_data FROM tbl_vehicle_toll").catch(() => ({ rows: [] }));
  for (const r of res2.rows) {
    let fd = r.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e){}
    }

    const tollName = String(fd['1786629185586'] || fd['Toll Name'] || fd['toll_name'] || 'Salik').trim();
    const accNo = String(fd['1786629206891'] || fd['Account No'] || fd['ACCOUNT NO'] || fd['account_no'] || '34866829').trim();

    const cleanFd = {
      "1786629185586": tollName,
      "1786629206891": accNo,
      "Toll Name": tollName,
      "Account No": accNo,
      "toll_name": tollName,
      "account_no": accNo
    };

    await db.query("UPDATE tbl_vehicle_toll SET field_data = $1 WHERE id = $2", [JSON.stringify(cleanFd), r.id]).catch(() => {});
  }

  process.exit(0);
}

cleanJsonSchema().catch(console.error);
