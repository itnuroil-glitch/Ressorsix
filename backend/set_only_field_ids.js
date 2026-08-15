const db = require('./src/config/db');

async function setOnlyFieldIds() {
  console.log("Cleaning tbl_toll_overview to store ONLY custom field IDs in field_data...");

  const res = await db.query("SELECT id, field_data FROM tbl_toll_overview");
  for (const r of res.rows) {
    let fd = r.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e){}
    }

    const tollName = String(fd['1786629185586'] || fd['Toll Name'] || fd['TOLL NAME'] || fd['toll_name'] || (r.id === 1 ? 'Darb' : 'Salik')).trim();
    const accNo = String(fd['1786629206891'] || fd['Account No'] || fd['ACCOUNT NO'] || fd['account_no'] || (r.id === 1 ? '7821989' : '34866829')).trim();

    const cleanFd = {
      "1786629185586": tollName,
      "1786629206891": isNaN(accNo) ? accNo : Number(accNo)
    };

    await db.query("UPDATE tbl_toll_overview SET field_data = $1 WHERE id = $2", [JSON.stringify(cleanFd), r.id]);
    console.log(`Overview Row #${r.id} updated ->`, cleanFd);
  }

  process.exit(0);
}

setOnlyFieldIds().catch(err => {
  console.error(err);
  process.exit(1);
});
