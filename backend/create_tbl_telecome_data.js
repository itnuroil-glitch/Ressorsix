const db = require('./src/config/db');

async function createTelecomDataTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tbl_telecome_data (
        id SERIAL PRIMARY KEY,
        custom_field_id INT,
        field_data JSONB DEFAULT '{}'::jsonb,
        clientid VARCHAR(100),
        country_id INT DEFAULT 1,
        company_id VARCHAR(255),
        moduleid INT DEFAULT 59,
        user_id INT,
        role_id INT,
        pdf_name VARCHAR(550),
        pdf_url TEXT,
        pdf_base64 TEXT,
        extracted_data JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'Active',
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createTableQuery);
    console.log('Successfully created database table: tbl_telecome_data');
  } catch (err) {
    console.error('Error creating table tbl_telecome_data:', err);
  } finally {
    process.exit();
  }
}

createTelecomDataTable();
