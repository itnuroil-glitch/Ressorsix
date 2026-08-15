const db = require('./src/config/db');

async function backfillTollOverviewIds() {
  console.log("Backfilling toll_overview_id in tbl_vehicle_toll_transaction...");

  // Fetch all overview records
  const overviewRes = await db.query("SELECT id, clientid, field_data FROM tbl_toll_overview WHERE (is_deleted = false OR is_deleted IS NULL)");
  console.log(`Found ${overviewRes.rows.length} overview records:`);
  console.table(overviewRes.rows.map(r => ({ id: r.id, clientid: r.clientid, field_data: JSON.stringify(r.field_data) })));

  let arbOverviewId = null;
  let salikOverviewId = null;

  for (const r of overviewRes.rows) {
    const fd = r.field_data || {};
    const str = JSON.stringify(fd).toLowerCase();
    if (str.includes('darb')) arbOverviewId = r.id;
    if (str.includes('salik')) salikOverviewId = r.id;
  }

  if (!salikOverviewId && overviewRes.rows.length > 0) salikOverviewId = overviewRes.rows[0].id;
  if (!arbOverviewId && overviewRes.rows.length > 0) arbOverviewId = overviewRes.rows[0].id;

  console.log(`Default Mappings -> Salik Overview ID: ${salikOverviewId}, Darb Overview ID: ${arbOverviewId}`);

  const txRes = await db.query("SELECT id, clientid, toll_name, amount, tag_number, plate FROM tbl_vehicle_toll_transaction");
  let updatedCount = 0;

  for (const tx of txRes.rows) {
    let targetOverviewId = null;

    const tName = tx.toll_name ? String(tx.toll_name).toLowerCase() : '';
    if (tName.includes('darb')) {
      targetOverviewId = arbOverviewId;
    } else {
      targetOverviewId = salikOverviewId;
    }

    if (targetOverviewId) {
      await db.query("UPDATE tbl_vehicle_toll_transaction SET toll_overview_id = $1 WHERE id = $2", [targetOverviewId, tx.id]);
      updatedCount++;
    }
  }

  console.log(`Successfully backfilled toll_overview_id for ${updatedCount} transaction records!`);

  const check = await db.query("SELECT id, toll_name, toll_overview_id FROM tbl_vehicle_toll_transaction LIMIT 10");
  console.table(check.rows);

  process.exit(0);
}

backfillTollOverviewIds().catch(console.error);
