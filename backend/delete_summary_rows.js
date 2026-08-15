const db = require('./src/config/db');

async function cleanSummaryRows() {
  const result = await db.query(`
    DELETE FROM tbl_vehicle_toll_transaction 
    WHERE LOWER(plate) LIKE '%totalamount%' 
       OR LOWER(direction) LIKE '%totaltrips%' 
       OR LOWER(toll_name) LIKE '%totaltrips%'
       OR plate IS NULL AND tag_number = '94'
  `);
  console.log(`Deleted ${result.rowCount} summary footer rows from tbl_vehicle_toll_transaction.`);
  process.exit(0);
}

cleanSummaryRows().catch(console.error);
