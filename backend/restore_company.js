const db = require('./src/config/db');

async function test() {
  try {
    const res = await db.query("UPDATE company SET is_deleted = false WHERE id = 6 RETURNING *");
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
