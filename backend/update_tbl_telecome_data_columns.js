const db = require('./src/config/db');

async function updateTelecomDataTableSchema() {
  try {
    const alterQuery = `
      ALTER TABLE tbl_telecome_data 
        ADD COLUMN IF NOT EXISTS bill_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS telecom_provider VARCHAR(100),
        ADD COLUMN IF NOT EXISTS period_from VARCHAR(50),
        ADD COLUMN IF NOT EXISTS period_to VARCHAR(50),
        ADD COLUMN IF NOT EXISTS issue_date VARCHAR(50),
        ADD COLUMN IF NOT EXISTS due_date VARCHAR(50),
        ADD COLUMN IF NOT EXISTS service_rental NUMERIC(12,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS usage_charges NUMERIC(12,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS one_time_charges NUMERIC(12,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS other_charges NUMERIC(12,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS vat NUMERIC(12,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0.00;
    `;

    await db.query(alterQuery);
    console.log('Successfully updated tbl_telecome_data schema with explicit relational columns.');
  } catch (err) {
    console.error('Error updating tbl_telecome_data columns:', err);
  } finally {
    process.exit();
  }
}

updateTelecomDataTableSchema();
