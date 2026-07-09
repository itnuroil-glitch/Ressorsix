const db = require('./src/config/db');
async function run() {
  try {
    // Check if table exists
    await db.query(`
      ALTER TABLE tbl_suppliers 
      ADD COLUMN IF NOT EXISTS custom_field_id INT,
      ADD COLUMN IF NOT EXISTS field_data JSONB,
      ADD COLUMN IF NOT EXISTS clientid INT,
      ADD COLUMN IF NOT EXISTS country_id INT,
      ADD COLUMN IF NOT EXISTS moduleid INT,
      ADD COLUMN IF NOT EXISTS roleid INT,
      ADD COLUMN IF NOT EXISTS user_id INT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('tbl_suppliers altered successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
