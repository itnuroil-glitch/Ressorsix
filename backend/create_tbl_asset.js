const db = require('./src/config/db');

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS tbl_asset (
      asset_id SERIAL PRIMARY KEY,
      asset_tag_number VARCHAR(100) UNIQUE NOT NULL,
      category_id INTEGER,
      brand_id INTEGER,
      serial_number VARCHAR(255),
      assigned_employee_id INTEGER,
      status VARCHAR(50) DEFAULT 'In Stock',
      is_deleted INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(query);
    console.log('tbl_asset created successfully!');
  } catch (e) {
    console.error('Error creating table:', e);
  } finally {
    process.exit();
  }
}

createTable();
