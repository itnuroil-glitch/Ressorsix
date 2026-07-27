require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');

async function checkLayouts() {
  try {
    const res = await db.query(`
      SELECT *
      FROM tbl_customfields
    `);
    console.log("CUSTOM FIELD LAYOUTS:");
    res.rows.forEach(r => {
      console.log(`ID: ${r.id}, ClientID: ${r.clientid || r.client_id}, ModuleID: ${r.moduleid || r.module_id}, CountryID: ${r.countryid || r.country_id}`);
      let parsed = {};
      try {
        parsed = typeof r.field_data === 'string' ? JSON.parse(r.field_data) : r.field_data;
      } catch (e) {}
      // Traverse sections and fields
      if (parsed) {
        parsed.forEach(sec => {
          if (sec.fields) {
            sec.fields.forEach(f => {
              if (f.type.includes('Dropdown') || f.type.includes('dropdown')) {
                console.log(`  Field Name: ${f.name}, Type: ${f.type}, Source: ${f.optionSource}, Path: ${f.dynamicPath}`);
              }
            });
          }
        });
      }
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkLayouts();
