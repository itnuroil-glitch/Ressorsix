const db = require('./src/config/db');

async function createServiceDetailsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS tbl_service_details (
      id SERIAL PRIMARY KEY,
      service_name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      status VARCHAR(20) DEFAULT 'Active',
      isdelete BOOLEAN DEFAULT false,
      is_deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await db.query(query);
    console.log('tbl_service_details table created successfully.');
  } catch (error) {
    console.error('Error creating tbl_service_details table:', error);
  } finally {
    process.exit();
  }
}

createServiceDetailsTable();
