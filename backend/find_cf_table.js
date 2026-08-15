const db = require('./src/config/db');

async function findCustomFieldTable() {
  const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%custom%' OR table_name LIKE '%field%'");
  console.log(res.rows);

  const res2 = await db.query("SELECT * FROM tbl_custom_field LIMIT 5").catch(() => null);
  if (res2) {
    console.log("tbl_custom_field found!");
    console.log(res2.rows);
  }
  process.exit(0);
}

findCustomFieldTable();
