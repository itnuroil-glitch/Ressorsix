const db = require('./src/config/db');

async function test() {
  try {
    const res = await db.query("SELECT * FROM employee WHERE email = 'vishnupriya@nurac.com'");
    console.log("Employee results:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
