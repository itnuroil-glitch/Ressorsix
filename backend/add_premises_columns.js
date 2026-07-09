require('dotenv').config();
const db = require('./src/config/db');

async function migrate() {
  try {
    // Add columns if they do not exist
    await db.query(`
      ALTER TABLE tbl_premises_details 
      ADD COLUMN IF NOT EXISTS type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS company VARCHAR(255)
    `);
    console.log("Columns 'type' and 'company' successfully added to tbl_premises_details.");
    
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_premises_details'
    `);
    console.log("Updated columns of tbl_premises_details:", res.rows.map(r => `${r.column_name} (${r.data_type})`));
  } catch (err) {
    console.error("Error during migration:", err);
  }
  process.exit(0);
}
migrate();
