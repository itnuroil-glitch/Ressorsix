const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trakio',
  password: '2965',
  port: 5432,
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT c.*, cl.name as client_name 
      FROM company c
      LEFT JOIN client cl ON c.clientid = cl.id
      WHERE c.is_deleted = false OR c.is_deleted IS NULL
      ORDER BY c.id DESC
    `);
    console.log('Success:', res.rows.length);
  } catch (err) {
    console.error('Error:', err.message);
  }
  pool.end();
}
check();
