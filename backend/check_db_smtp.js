const db = require('./src/config/db');

async function test() {
  try {
    const res = await db.query(`
      SELECT s.* 
      FROM smtp_configuration s
      JOIN users u ON s.userid = u.id
      WHERE u.clientid = 6 
        AND s.is_deleted = false 
        AND s.status = 1 
      ORDER BY CASE WHEN u.roleid = 2 THEN 0 ELSE 1 END ASC, s.id ASC
      LIMIT 1
    `);
    console.log("Current Database SMTP Config for client 6:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
