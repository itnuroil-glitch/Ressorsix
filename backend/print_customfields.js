require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const fields = await db.query(`
      SELECT id, clientid, moduleid, country_id, isdelete, status
      FROM tbl_customfields
    `);
    
    console.log("=== tbl_customfields rows ===");
    console.table(fields.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
