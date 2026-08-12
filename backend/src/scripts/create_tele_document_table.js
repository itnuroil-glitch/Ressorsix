const db = require('../config/db');

async function createTeleDocumentTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tbl_tele_document (
        id SERIAL PRIMARY KEY,
        custom_field_id INTEGER,
        clientid VARCHAR(255),
        country_id INTEGER DEFAULT 1,
        company_id VARCHAR(255),
        moduleid INTEGER DEFAULT 61,
        user_id INTEGER,
        company VARCHAR(255),
        mobile_account VARCHAR(255),
        document_type VARCHAR(255),
        document_number VARCHAR(255),
        issue_date DATE,
        expiry_date DATE,
        file_upload TEXT,
        remarks TEXT,
        field_data JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'Active',
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createTableQuery);
    console.log('Successfully created database table: tbl_tele_document');

    // Also create tbl_tele_documents alias/view if needed or keep tbl_tele_document as primary
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_documents (
        LIKE tbl_tele_document INCLUDING ALL
      );
    `);
    console.log('Successfully ensured tbl_tele_documents table structure as well.');

    process.exit(0);
  } catch (err) {
    console.error('Error creating tbl_tele_document table:', err);
    process.exit(1);
  }
}

createTeleDocumentTable();
