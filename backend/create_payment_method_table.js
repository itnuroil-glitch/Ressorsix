const db = require('./src/config/db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_payment_method (
        id SERIAL PRIMARY KEY,
        payment_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        isdelete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('tbl_payment_method created successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
