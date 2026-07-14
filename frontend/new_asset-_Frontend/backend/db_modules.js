require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const res = await db.query(`SELECT * FROM module`);
    console.log("Modules in DB:", res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
