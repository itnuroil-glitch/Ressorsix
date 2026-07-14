const { pool } = require('./src/config/db');

async function createTable() {
  // We create both tbl_vehile_purchase and tbl_vehicle_purchase to handle the typo robustly.
  const queryVehile = `
    CREATE TABLE IF NOT EXISTS tbl_vehile_purchase (
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

  const queryVehicle = `
    CREATE TABLE IF NOT EXISTS tbl_vehicle_purchase (
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
    await pool.query(queryVehile);
    console.log('Table tbl_vehile_purchase created successfully.');
    await pool.query(queryVehicle);
    console.log('Table tbl_vehicle_purchase created successfully.');
  } catch (e) {
    console.error('Error creating purchase tables:', e);
  } finally {
    process.exit();
  }
}

createTable();
