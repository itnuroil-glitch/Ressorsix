require('dotenv').config();
const db = require('./src/config/db');

async function inspect() {
  try {
    // 1. Columns of attachment table
    const attColumns = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'attachment'
    `);
    console.log("Attachment Columns:", attColumns.rows);

    // 2. Sample clients
    const clients = await db.query(`
      SELECT * FROM client LIMIT 3
    `);
    console.log("Clients:", clients.rows);

    // 3. Sample company records
    const companies = await db.query(`
      SELECT id, clientid, company_name FROM company LIMIT 3
    `);
    console.log("Companies:", companies.rows);

    // 4. Sample vehicle insurance records
    const vInsurance = await db.query(`
      SELECT * FROM tbl_vehicle_insurance LIMIT 1
    `);
    console.log("Vehicle Insurance Sample:", vInsurance.rows);
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
  process.exit(0);
}
inspect();
