const db = require('./src/config/db');

async function simplifyJson() {
  console.log("Simplifying JSON field_data in tbl_toll_overview...");

  const res = await db.query("SELECT id, field_data FROM tbl_toll_overview");
  for (const r of res.rows) {
    let fd = r.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e){}
    }

    const tollName = String(fd['1786629185586'] || fd['Toll Name'] || fd['toll_name'] || 'Salik').trim();
    const accNo = String(fd['1786629206891'] || fd['Account No'] || fd['account_no'] || '34866829').trim();

    const cleanFd = {
      "1786629185586": tollName,
      "1786629206891": accNo,
      "Toll Name": tollName,
      "Account No": accNo
    };

    await db.query("UPDATE tbl_toll_overview SET field_data = $1 WHERE id = $2", [JSON.stringify(cleanFd), r.id]);
    console.log(`Record #${r.id} cleaned:`, cleanFd);
  }

  process.exit(0);
}

simplifyJson().catch(console.error);
