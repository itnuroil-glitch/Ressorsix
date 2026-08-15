const db = require('./src/config/db');

async function checkModuleCustomFields() {
  const res = await db.query("SELECT id, moduleid, field_data FROM tbl_customfields WHERE moduleid IN (50, 70, 71)");
  console.log("Found records:", res.rows.length);
  for (const r of res.rows) {
    console.log(`\n--- CustomField Record ID: ${r.id}, Module ID: ${r.moduleid} ---`);
    let fd = r.field_data;
    if (typeof fd === 'string') {
      try { fd = JSON.parse(fd); } catch(e){}
    }
    console.log(JSON.stringify(fd, null, 2));
  }
  process.exit(0);
}

checkModuleCustomFields();
