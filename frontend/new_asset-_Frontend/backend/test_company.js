const db = require('./src/config/db');

async function test() {
  try {
    const res = await db.query("SELECT id, company_name, contact_email FROM company WHERE id = 6");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
