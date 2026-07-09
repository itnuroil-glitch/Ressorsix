const db = require('./src/config/db');

async function createSupplierTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_suppliers (
        id SERIAL PRIMARY KEY,
        supplier_id VARCHAR(100),
        supplier_code VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        isdelete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Successfully created tbl_suppliers table');

  } catch (error) {
    console.error('Error creating supplier table:', error);
  } finally {
    process.exit();
  }
}

createSupplierTable();
