const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  max: 2,
  idleTimeoutMillis: 1000,
});

pool.on('connect', () => {
  console.log('Successfully connected to the Trakio PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
