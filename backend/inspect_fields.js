require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const res = await db.query("SELECT id, clientid, country_id, moduleid, field_data FROM tbl_customfields WHERE moduleid = 42");
    console.log("=== CUSTOM FIELD LAYOUTS FOR MODULE 42 ===");
    for (let row of res.rows) {
      console.log(`ID: ${row.id}, Client: ${row.clientid}, Country: ${row.country_id}, Module: ${row.moduleid}`);
      console.log("Field Data (keys):");
      try {
        const parsed = typeof row.field_data === 'string' ? JSON.parse(row.field_data) : row.field_data;
        const keys = [];
        if (Array.isArray(parsed)) {
          parsed.forEach(sec => {
            if (sec.fields) sec.fields.forEach(f => keys.push(f.id));
          });
        }
        console.log(keys);
      } catch (e) {
        console.log("error parsing field_data", e);
      }
      console.log("-----------------------------------------");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
