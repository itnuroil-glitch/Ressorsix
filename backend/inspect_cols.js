const db = require('./src/config/db');

async function inspectCols() {
  const res = await db.query("SELECT * FROM tbl_customfields LIMIT 1");
  console.log("Columns in tbl_customfields:", Object.keys(res.rows[0] || {}));
  console.log(res.rows[0]);
  process.exit(0);
}

inspectCols();
