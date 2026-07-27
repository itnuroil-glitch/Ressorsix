const db = require('./config/db');

async function testQuery() {
  try {
    const query = `
      SELECT 
        v.*, 
        c.company_name AS company_name
      FROM tbl_vehicle_insurance v
      LEFT JOIN company c ON v.company_id = c.id
      LIMIT 5
    `;
    const res = await db.query(query);
    console.log('Query successful! Rows:', res.rows.length);
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
}

testQuery();
