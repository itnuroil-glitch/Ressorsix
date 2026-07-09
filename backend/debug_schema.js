const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '2965',
  port: 5432,
  database: 'trakio'
});

async function run() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_asset'");
    console.log("tbl_asset cols:", res.rows.map(r=>r.column_name));
    
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_Asset_Opening'");
    console.log("tbl_Asset_Opening cols:", res2.rows.map(r=>r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
