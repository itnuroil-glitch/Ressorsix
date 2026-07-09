require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    // Check client IDs
    const clients = await db.query('SELECT id, client_name FROM client WHERE isdelete = false');
    console.log("Active clients:", clients.rows);

    // Check custom fields related to policy
    const fields = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%policy%' 
         OR LOWER(field_name) LIKE '%policyno%' 
         OR LOWER(field_name) LIKE '%policy_no%'
    `);
    console.log("Policy-related custom fields in tbl_customfield_details:", fields.rows);

    // Check vehicle insurance records
    const vIns = await db.query('SELECT id, clientid, vehicle_id, field_data FROM tbl_vehicle_insurance');
    console.log("All vehicle insurance records:", JSON.stringify(vIns.rows, null, 2));

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
