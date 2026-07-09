require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const tables = ['tbl_customfields', 'tbl_feild_permision', 'tbl_customfieldsvalues'];
    for (const t of tables) {
      const res = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [t]);
      console.log(`\nTable: ${t}`);
      res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
