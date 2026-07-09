require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const res = await db.query("SELECT * FROM tbl_feild_permision WHERE moduleid = 42");
    console.log("=== PERMISSIONS FOR MODULE 42 ===");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
