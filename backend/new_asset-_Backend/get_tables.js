require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)
  .then(res => console.log(res.rows.map(r => r.table_name)))
  .catch(console.error)
  .finally(() => pool.end());
