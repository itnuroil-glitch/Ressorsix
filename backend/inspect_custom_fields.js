const db = require('./src/config/db');

async function inspectCustomFields() {
  const res = await db.query("SELECT id, moduleid, custom_field_details FROM tbl_customfields");
  
  for (const r of res.rows) {
    let details = r.custom_field_details;
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch(e){}
    }
    console.log(`CustomField Record ID: ${r.id}, Module ID: ${r.moduleid}`);
    console.log(JSON.stringify(details, null, 2));
  }

  process.exit(0);
}

inspectCustomFields();
