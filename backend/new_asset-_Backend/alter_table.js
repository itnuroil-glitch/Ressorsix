const db = require('./src/config/db');

async function runQuery() {
  try {
    console.log("Checking if column exists...");
    const checkRes = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tbl_customfield_details' AND column_name='subsection_id';
    `);

    if (checkRes.rows.length === 0) {
      console.log("Column 'subsection_id' does not exist. Adding it...");
      await db.query(`ALTER TABLE tbl_customfield_details ADD COLUMN subsection_id character varying(255);`);
      console.log("Column 'subsection_id' added successfully.");
    } else {
      console.log("Column 'subsection_id' already exists.");
      // Maybe alter it to 255?
      await db.query(`ALTER TABLE tbl_customfield_details ALTER COLUMN subsection_id TYPE character varying(255);`);
      console.log("Altered column type to varying(255)");
    }
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    process.exit(0);
  }
}

runQuery();
