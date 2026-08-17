const { pool } = require('./src/config/db');

async function createVehicleMaintenanceTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tbl_vehicle_maintenance (
      id SERIAL PRIMARY KEY,
      vehicle_id VARCHAR(255),
      custom_field_id INTEGER,
      field_data JSONB,
      clientid VARCHAR(255),
      country_id VARCHAR(255),
      moduleid INTEGER DEFAULT 75,
      roleid VARCHAR(255),
      user_id INTEGER,
      company_id VARCHAR(255),
      is_deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "tbl_vehicle_Maintenance" (
      id SERIAL PRIMARY KEY,
      vehicle_id VARCHAR(255),
      custom_field_id INTEGER,
      field_data JSONB,
      clientid VARCHAR(255),
      country_id VARCHAR(255),
      moduleid INTEGER DEFAULT 75,
      roleid VARCHAR(255),
      user_id INTEGER,
      company_id VARCHAR(255),
      is_deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log('Successfully created tbl_vehicle_maintenance and "tbl_vehicle_Maintenance" tables.');
  } catch (error) {
    console.error('Error creating tbl_vehicle_maintenance table:', error);
  } finally {
    process.exit();
  }
}

createVehicleMaintenanceTable();
