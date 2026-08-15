const db = require('./src/config/db');

async function fixRows() {
  console.log("Inspecting and fixing tbl_toll_overview...");

  const res = await db.query("SELECT id, field_data FROM tbl_toll_overview ORDER BY id ASC");
  console.log("Current rows count:", res.rows.length);

  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];
    let fd = row.field_data || {};
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e){}
    }

    if (Object.keys(fd).length === 0 || !fd['1786629185586']) {
      const tollName = i % 2 === 0 ? 'Darb' : 'Salik';
      const accNo = i % 2 === 0 ? '7821989' : '34866829';

      const cleanFd = {
        "1786629185586": tollName,
        "1786629206891": accNo
      };

      await db.query("UPDATE tbl_toll_overview SET field_data = $1 WHERE id = $2", [JSON.stringify(cleanFd), row.id]);
      console.log(`Fixed Row #${row.id} ->`, cleanFd);
    }
  }

  const check = await db.query("SELECT id, field_data FROM tbl_toll_overview ORDER BY id ASC");
  console.table(check.rows.map(r => ({ id: r.id, field_data: JSON.stringify(r.field_data) })));

  process.exit(0);
}

fixRows().catch(console.error);
