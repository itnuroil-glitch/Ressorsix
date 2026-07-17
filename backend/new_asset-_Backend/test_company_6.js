const db = require('./src/config/db');

async function test() {
  try {
    const res = await db.query("SELECT * FROM company WHERE id = 6");
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
