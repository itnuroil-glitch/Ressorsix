// One-time: add a history row for every existing connection that already has an employee
// and no ACTIVE row yet in tbl_tele_reassignment.
const db = require('./src/config/db');

(async () => {
  try {
    const result = await db.query(`
      INSERT INTO tbl_tele_reassignment (connection_id, employee_name, assigned_from, performed_by, status)
      SELECT c.id, c.employee_name, c.assigned_from, 'System', 'ACTIVE'
      FROM tbl_tele_connection c
      WHERE c.is_deleted = 0
        AND c.employee_name IS NOT NULL
        AND TRIM(c.employee_name) <> ''
        AND LOWER(c.employee_name) NOT LIKE '%unassigned%'
        AND NOT EXISTS (
          SELECT 1 FROM tbl_tele_reassignment r
          WHERE r.connection_id = c.id AND r.status = 'ACTIVE'
        )
      RETURNING connection_id, employee_name
    `);
    console.log(`Added ${result.rowCount} history row(s):`);
    result.rows.forEach(r => console.log(`  connection ${r.connection_id} -> ${r.employee_name}`));
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err.message);
    process.exit(1);
  }
})();
