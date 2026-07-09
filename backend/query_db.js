const db = require('./src/config/db');

async function run() {
  try {
    // Get all assignment records with employee IDs
    const res = await db.query(`
      SELECT 
        aa.id AS assignment_id,
        aa.asset_id,
        ast.field_data->>'1781609374288' AS asset_name,
        aa.field_data->>'1781703976717' AS employee_id_raw,
        aa.field_data->>'1781762558649' AS notes,
        aa.field_data->>'1781762342366' AS assigned_date,
        aa.field_data->'assetItems' AS assigned_barcodes
      FROM tbl_asset_assigned aa
      LEFT JOIN tbl_asset ast ON aa.asset_id = ast.id
      WHERE aa.is_deleted = false
      ORDER BY aa.id DESC
    `);

    // For each record, resolve employee name
    for (const row of res.rows) {
      if (row.employee_id_raw) {
        const empRes = await db.query(
          `SELECT full_name, email FROM employee WHERE id = $1`,
          [parseInt(row.employee_id_raw, 10)]
        );
        row.employee_name = empRes.rows.length > 0 ? empRes.rows[0].full_name : 'Unknown';
        row.employee_email = empRes.rows.length > 0 ? empRes.rows[0].email : '-';
      } else {
        row.employee_name = 'Not Set';
        row.employee_email = '-';
      }
      // Show barcodes assigned
      const items = row.assigned_barcodes || [];
      row.barcodes = items.map(i => (i.barcodes || []).join(', ')).join(' | ');
      delete row.assigned_barcodes;
    }

    console.log("\n=== Asset Assignment Report ===\n");
    console.table(res.rows.map(r => ({
      'Assignment ID': r.assignment_id,
      'Asset': r.asset_name,
      'Employee Name': r.employee_name,
      'Employee Email': r.employee_email,
      'Assigned Date': r.assigned_date,
      'Notes': r.notes || '-',
      'Barcodes': r.barcodes
    })));

  } catch (err) {
    console.error(err.message);
  } finally {
    process.exit(0);
  }
}

run();
