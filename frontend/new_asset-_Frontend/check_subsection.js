const db = require('./backend/src/config/db');

async function testQuery() {
  try {
    const result = await db.query('SELECT * FROM tbl_subsection');
    console.log('tbl_subsection:', result.rows);
  } catch (error) {
    console.error('Error in query:', error);
  } finally {
    process.exit();
  }
}

testQuery();
