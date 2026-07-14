const db = require('./src/config/db');

async function test() {
  try {
    const res = await db.query("SELECT id, company_name, is_deleted, contact_email FROM company WHERE clientid = 6");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
