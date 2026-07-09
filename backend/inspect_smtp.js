const db = require('./src/config/db');

async function test() {
  try {
    const res = await db.query('SELECT * FROM smtp_configuration');
    console.log("ALL SMTP CONFIGURATIONS:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
