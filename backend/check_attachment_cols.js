require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attachment'
    `);
    console.log('Columns of attachment:', res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
