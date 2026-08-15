const db = require('./src/config/db');

async function renumberAndResetSequence() {
  try {
    console.log("Renumbering IDs in tbl_toll_overview to start from 1...");

    await db.query(`
      WITH renumbered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as new_id
        FROM tbl_toll_overview
      )
      UPDATE tbl_toll_overview t
      SET id = r.new_id
      FROM renumbered r
      WHERE t.id = r.id;
    `);

    const seqRes = await db.query(`
      SELECT pg_get_serial_sequence('tbl_toll_overview', 'id') as seq_name;
    `);
    const seqName = seqRes.rows[0]?.seq_name || 'tbl_toll_overview_id_seq';

    await db.query(`SELECT setval('${seqName}', (SELECT MAX(id) FROM tbl_toll_overview));`);

    const check = await db.query("SELECT id, field_data FROM tbl_toll_overview ORDER BY id ASC");
    console.log("Updated records:");
    console.table(check.rows.map(r => ({ id: r.id, field_data: JSON.stringify(r.field_data) })));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

renumberAndResetSequence();
