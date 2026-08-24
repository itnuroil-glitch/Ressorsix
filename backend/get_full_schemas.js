const db = require('./src/config/db');

async function printSchema(tableName) {
  const res = await db.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  console.log(`\n=== ${tableName} ===`);
  console.log(res.rows);
}

async function main() {
  await printSchema('tbl_sim_plan');
  await printSchema('tbl_sim_details');
  await printSchema('tbl_telecom_provider');
  await printSchema('tbl_sim_connection_type');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
