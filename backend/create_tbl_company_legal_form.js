const db = require('./src/config/db');

async function createTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_company_legal_form (
        id SERIAL PRIMARY KEY,
        legal_form_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('tbl_company_legal_form created successfully!');

    // Seed default forms if empty
    const checkRes = await db.query(`SELECT COUNT(*) FROM tbl_company_legal_form WHERE is_deleted = 0`);
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const defaultForms = [
        'Limited Liability Company (LLC)',
        'Sole Establishment',
        'Free Zone Establishment (FZE)',
        'Free Zone Company (FZ-LLC)',
        'Branch of a Foreign Company',
        'Public Joint Stock Company (PJSC)',
        'Private Joint Stock Company (PrJSC)',
        'General Partnership'
      ];
      for (const name of defaultForms) {
        await db.query(
          `INSERT INTO tbl_company_legal_form (legal_form_name, status, is_deleted) VALUES ($1, $2, 0)`,
          [name, 'Active']
        );
      }
      console.log('Seeded default legal forms into tbl_company_legal_form');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error creating table tbl_company_legal_form:', err);
    process.exit(1);
  }
}

createTable();
