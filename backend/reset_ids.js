const db = require('./src/config/db');

async function resetOverviewIds() {
  try {
    console.log("Renumbering tbl_toll_overview IDs starting from 1...");

    // 1. Temporarily drop foreign key or disable constraints if needed, or perform CTE update
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

    // 2. Find auto-increment sequence name and reset it
    const seqRes = await db.query(`
      SELECT pg_get_serial_sequence('tbl_toll_overview', 'id') as seq_name;
    `);
    const seqName = seqRes.rows[0]?.seq_name || 'tbl_toll_overview_id_seq';

    const maxIdRes = await db.query("SELECT MAX(id) FROM tbl_toll_overview");
    const maxId = parseInt(maxIdRes.rows[0]?.max || 0, 10);
    const nextVal = maxId > 0 ? maxId + 1 : 1;

    await db.query(`SELECT setval('${seqName}', ${maxId > 0 ? maxId : 1}, ${maxId > 0});`);

    console.log(`Successfully renumbered tbl_toll_overview! Max ID: ${maxId}, Next Sequence Val: ${nextVal}`);

    const check = await db.query("SELECT id, field_data->>'Toll Name' as name, field_data->>'Account No' as acc FROM tbl_toll_overview ORDER BY id ASC");
    console.table(check.rows);
    process.exit(0);
  } catch (err) {
    console.error("Error resetting IDs:", err);
    process.exit(1);
  }
}

resetOverviewIds();
