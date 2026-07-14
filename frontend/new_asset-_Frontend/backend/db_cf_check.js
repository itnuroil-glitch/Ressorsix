require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const res = await db.query(`SELECT id, clientid, moduleid, country_id, status FROM tbl_customfields WHERE moduleid IN (19, 23)`);
    console.log("Custom fields for 19 and 23:", res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
