require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query(`SELECT id, email, roleid FROM users`)
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => pool.end());
