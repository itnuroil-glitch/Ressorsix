const { pool } = require('./src/config/db');

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS tbl_vehicle_details (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER,
      custom_field_id INTEGER,
      field_data JSONB,
      clientid INTEGER,
      country_id INTEGER,
      moduleid INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Table tbl_vehicle_details created successfully.');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
createTable();
