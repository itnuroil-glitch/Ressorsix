const db = require('./src/config/db');

async function createUsageChargeDataTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tbl_usage_charge_data (
        id SERIAL PRIMARY KEY,
        telecom_data_id INT,
        bill_number VARCHAR(100),
        mobile_number VARCHAR(100),
        category VARCHAR(255),
        service_description VARCHAR(255),
        units VARCHAR(100),
        duration VARCHAR(100),
        amount NUMERIC(12,2) DEFAULT 0.00,
        vat_amount NUMERIC(12,2) DEFAULT 0.00,
        clientid VARCHAR(100),
        company_id VARCHAR(255),
        user_id INT,
        role_id INT,
        raw_json JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'Active',
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createTableQuery);
    console.log('Successfully created database table: tbl_usage_charge_data');
  } catch (err) {
    console.error('Error creating table tbl_usage_charge_data:', err);
  } finally {
    process.exit();
  }
}

createUsageChargeDataTable();
