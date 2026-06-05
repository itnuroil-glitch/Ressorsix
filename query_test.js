require('dotenv').config({ path: 'backend/.env' });
const db = require('./backend/src/config/db');

async function test() {
  const res = await db.query('SELECT * FROM module');
  console.log("Modules:", res.rows);
  const res2 = await db.query('SELECT * FROM tbl_feild_permision');
  console.log("Permissions:", res2.rows);
  const res3 = await db.query('SELECT id, clientid, moduleid, countryid FROM tbl_customfields');
  console.log("Custom fields:", res3.rows);
  process.exit(0);
}
test();
