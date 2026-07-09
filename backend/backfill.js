const db = require('./src/config/db');

async function run() {
  try {
    await db.query("INSERT INTO tbl_asset_log (assignment_id, asset_id, barcode, employee_id, action_type, clientid) VALUES (1, 1, 'AST-1-1781695855446-2', '19', 'Assigned', 6)");
    await db.query("INSERT INTO tbl_asset_log (assignment_id, asset_id, barcode, employee_id, action_type, clientid) VALUES (2, 1, 'AST-1-1781695855446-0', '23', 'Assigned', 6)");
    console.log('Backfilled records!');
    const res = await db.query('SELECT * FROM tbl_asset_log');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
