require('dotenv').config();
const db = require('./src/config/db');

async function check() {
  try {
    const modules = await db.query("SELECT id, module_name FROM module");
    console.log("=== MODULES ===");
    console.table(modules.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
