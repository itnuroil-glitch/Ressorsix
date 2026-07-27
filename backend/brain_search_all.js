require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');

async function searchAll() {
  try {
    const tablesRes = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      try {
        const columnsRes = await db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [tableName]);
        
        const textCols = columnsRes.rows
          .filter(c => ['character varying', 'text', 'jsonb', 'json'].includes(c.data_type))
          .map(c => c.column_name);
          
        if (textCols.length === 0) continue;
        
        // Construct query to check if any text col contains 'raize'
        const conditions = textCols.map(c => `LOWER(CAST(${c} AS text)) LIKE '%raize%'`).join(' OR ');
        const query = `SELECT * FROM "${tableName}" WHERE ${conditions}`;
        const searchRes = await db.query(query);
        
        if (searchRes.rows.length > 0) {
          console.log(`Table "${tableName}" has ${searchRes.rows.length} rows matching "raize":`);
          searchRes.rows.forEach(r => {
            console.log(r);
          });
        }
      } catch (err) {
        // console.error(`Error querying table ${tableName}:`, err.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
searchAll();
