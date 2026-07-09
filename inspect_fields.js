require('dotenv').config({ path: 'backend/.env' });
const db = require('./backend/src/config/db');

async function check() {
  try {
    const fields = await db.query(`
      SELECT id, clientid, moduleid, countryid, field_data
      FROM tbl_customfield_details
      WHERE isdelete = false
    `);
    
    console.log("Custom field configurations count:", fields.rows.length);
    for (const f of fields.rows) {
      let data = f.field_data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch(e) {}
      }
      if (Array.isArray(data)) {
        for (const section of data) {
          for (const field of (section.fields || [])) {
            if (field.name.toLowerCase().includes('policy') || field.name.toLowerCase().includes('insurance')) {
              console.log(`Match: Field ID ${field.id}, Name: "${field.name}", Type: "${field.type}", OptionSource: "${field.optionSource}", Path: "${field.dynamicPath}"`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
