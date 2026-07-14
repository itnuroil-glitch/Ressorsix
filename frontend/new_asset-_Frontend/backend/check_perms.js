require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query(`SELECT m.module_name, rp.* FROM role_permission rp JOIN module m ON rp.module_id = m.id WHERE rp.role_id = 2`)
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => pool.end());
