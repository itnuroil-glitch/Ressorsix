const db = require('./src/config/db');

async function recreateStrictTable() {
  try {
    await db.query(`DROP TABLE IF EXISTS tbl_telecome_data CASCADE;`);

    // Create table with only core metadata + exact PDF extracted fields
    const createQuery = `
      CREATE TABLE tbl_telecome_data (
        id SERIAL PRIMARY KEY,
        clientid VARCHAR(100),
        company_id VARCHAR(255),
        company VARCHAR(255),
        user_id INT,
        role_id INT,
        moduleid INT DEFAULT 59,
        country_id INT DEFAULT 1,
        
        -- Exact PDF Extracted Fields ONLY
        telecom_provider VARCHAR(100),
        mobile_account VARCHAR(100),
        mobile_number VARCHAR(100),
        bill_number VARCHAR(100),
        doc_number VARCHAR(100),
        period_from VARCHAR(50),
        period_to VARCHAR(50),
        issue_date VARCHAR(50),
        due_date VARCHAR(50),
        expiry_date VARCHAR(50),
        service_rental VARCHAR(100),
        usage_charges VARCHAR(100),
        one_time_charges VARCHAR(100),
        other_charges VARCHAR(100),
        vat VARCHAR(100),
        total_amount VARCHAR(100),
        
        pdf_name VARCHAR(550),
        attached_pdf VARCHAR(550),
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
    console.log('Successfully recreated tbl_telecome_data containing ONLY exact PDF extracted fields!');
  } catch (err) {
    console.error('Error recreating table:', err);
  } finally {
    process.exit();
  }
}

recreateStrictTable();
