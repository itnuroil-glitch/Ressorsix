require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query(`SELECT rp.*, m.module_name, c.company_name FROM role_permission rp JOIN module m ON rp.module_id = m.id LEFT JOIN company c ON rp.company_id = c.id WHERE rp.role_id = 11 ORDER BY rp.module_id, rp.company_id`)
  .then(res => console.log(JSON.stringify(res.rows, null, 2)))
  .catch(console.error)
  .finally(() => pool.end());
