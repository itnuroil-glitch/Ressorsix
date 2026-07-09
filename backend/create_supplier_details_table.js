const db = require('./src/config/db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_supplier_details (
        id SERIAL PRIMARY KEY,
        custom_field_id INT,
        field_data JSONB,
        clientid INT,
        country_id INT,
        moduleid INT,
        roleid INT,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("tbl_supplier_details created successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
