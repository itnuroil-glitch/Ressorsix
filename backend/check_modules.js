const db = require('./src/config/db');

async function run() {
  try {
    const res = await db.query("SELECT id, module_name, route, parent_id FROM module ORDER BY id ASC");
    console.log("MODULES LIST:");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

run();
