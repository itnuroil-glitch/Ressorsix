require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const fields = await db.query(`
      SELECT cf.id, cf.clientid, cf.moduleid, cf.country_id, cf.field_data,
             c.client_name, m.module_name
      FROM tbl_customfields cf
      LEFT JOIN client c ON cf.clientid = c.id
      LEFT JOIN module m ON cf.moduleid = m.id
      WHERE cf.isdelete = false
    `);
    
    for (const f of fields.rows) {
      console.log(`\n========================================`);
      console.log(`Config ID: ${f.id}, Client: ${f.client_name} (ID: ${f.clientid}), Module: ${f.module_name} (ID: ${f.moduleid})`);
      let data = f.field_data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch(e) {}
      }
      if (Array.isArray(data)) {
        for (const section of data) {
          console.log(`  Section: "${section.name}" (ID: ${section.id})`);
          for (const field of (section.fields || [])) {
            console.log(`    - Field: "${field.name}" (ID: ${field.id}), Type: ${field.type}, Source: ${field.optionSource}, Path: ${field.dynamicPath}, Options: ${field.options}`);
            for (const sub of field.subsections || []) {
              console.log(`      Subsection: "${sub.name}" (Trigger: ${sub.triggerValue})`);
              for (const sf of sub.fields || []) {
                console.log(`        - SubField: "${sf.name}" (ID: ${sf.id}), Type: ${sf.type}, Source: ${sf.optionSource}, Path: ${sf.dynamicPath}`);
              }
            }
          }
        }
      } else {
        console.log(`  Invalid/empty layout:`, data);
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
