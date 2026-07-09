const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trakio',
  password: '2965',
  port: 5432,
});

async function run() {
  const res = await pool.query(`SELECT id, field_data FROM tbl_asset WHERE field_data::text ILIKE '%HP ProBook%'`);
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
}
run();
