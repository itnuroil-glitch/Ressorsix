const db = require('./src/config/db');

async function run() {
  try {
    const res = await db.query("SELECT * FROM tbl_company_def_currency ORDER BY id ASC");
    console.log("CURRENCIES IN DB (count:", res.rows.length, "):");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

run();
