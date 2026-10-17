const db = require('./src/config/db');

async function createTeleConnectionTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tbl_tele_connection (
        id SERIAL PRIMARY KEY,
        connection_type VARCHAR(50) NOT NULL DEFAULT 'SIM',
        company_name VARCHAR(255) NOT NULL,
        sub_company VARCHAR(255),
        provider VARCHAR(100) NOT NULL,
        connection_number VARCHAR(50) NOT NULL,
        account_number VARCHAR(100),
        iccid VARCHAR(50),
        contract_no VARCHAR(100),
        contract_from VARCHAR(50),
        contract_to VARCHAR(50),
        plan_name VARCHAR(255),
        monthly_plan_amount NUMERIC(12, 2) DEFAULT 0.00,
        data_allowance VARCHAR(50),
        data_unit VARCHAR(20) DEFAULT 'GB',
        local_minutes VARCHAR(50),
        international_minutes VARCHAR(50),
        local_sms VARCHAR(50),
        international_sms VARCHAR(50),
        cug VARCHAR(50),
        employee_name VARCHAR(255) DEFAULT 'Unassigned',
        assigned_from VARCHAR(50),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        client_id INT DEFAULT 1,
        created_by VARCHAR(100),
        updated_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_deleted SMALLINT DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_tele_conn_number ON tbl_tele_connection(connection_number);
      CREATE INDEX IF NOT EXISTS idx_tele_conn_company ON tbl_tele_connection(company_name);
      CREATE INDEX IF NOT EXISTS idx_tele_conn_employee ON tbl_tele_connection(employee_name);
      CREATE INDEX IF NOT EXISTS idx_tele_conn_status ON tbl_tele_connection(status);
    `;

    await db.query(query);
    console.log('Successfully created table tbl_tele_connection and its indexes in PostgreSQL!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tbl_tele_connection:', error);
    process.exit(1);
  }
}

createTeleConnectionTable();
