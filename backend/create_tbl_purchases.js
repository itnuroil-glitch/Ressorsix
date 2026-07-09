const db = require('./src/config/db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INT REFERENCES tbl_suppliers(id) ON DELETE SET NULL,
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
    console.log('tbl_purchases created successfully.');
  } catch (err) {
    console.error('Error creating tbl_purchases:', err);
  } finally {
    process.exit();
  }
}

run();
