const db = require('./src/config/db');

async function recreateTable() {
  try {
    // 1. Drop existing table to ensure clean column ordering without old JSON fields
    await db.query(`DROP TABLE IF EXISTS tbl_telecome_data CASCADE;`);

    // 2. Create clean table with all explicit fields as columns
    const createQuery = `
      CREATE TABLE tbl_telecome_data (
        id SERIAL PRIMARY KEY,
        custom_field_id INT,
        clientid VARCHAR(100),
        company_id VARCHAR(255),
        company VARCHAR(255),
        user_id INT,
        role_id INT,
        moduleid INT DEFAULT 59,
        country_id INT DEFAULT 1,
        department VARCHAR(255),
        assigned_employee VARCHAR(255),
        doc_type_id VARCHAR(100),
        doc_number VARCHAR(100),
        bill_number VARCHAR(100),
        account_number VARCHAR(100),
        mobile_account VARCHAR(100),
        mobile_number VARCHAR(100),
        sim_number VARCHAR(100),
        telecom_provider VARCHAR(100),
        plan_name VARCHAR(255),
        monthly_plan_amount VARCHAR(100),
        data_allowance VARCHAR(100),
        local_minutes VARCHAR(100),
        international_minutes VARCHAR(100),
        local_sms_allowance VARCHAR(100),
        international_sms_allowance VARCHAR(100),
        period_from VARCHAR(50),
        period_to VARCHAR(50),
        issue_date VARCHAR(50),
        due_date VARCHAR(50),
        expiry_date VARCHAR(50),
        activation_date VARCHAR(50),
        contract_start_date VARCHAR(50),
        contract_expiry_date VARCHAR(50),
        service_rental VARCHAR(100),
        usage_charges VARCHAR(100),
        one_time_charges VARCHAR(100),
        other_charges VARCHAR(100),
        vat VARCHAR(100),
        total_amount VARCHAR(100),
        attached_pdf VARCHAR(550),
        pdf_name VARCHAR(550),
        pdf_url TEXT,
        pdf_base64 TEXT,
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createQuery);
    console.log('Successfully recreated tbl_telecome_data with all explicit PDF fields as column heads.');
  } catch (err) {
    console.error('Error recreating table:', err);
  } finally {
    process.exit();
  }
}

recreateTable();
