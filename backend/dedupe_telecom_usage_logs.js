// One-time cleanup: remove exact duplicate rows in tbl_telecome_call_logs and tbl_telecome_sms_logs
// (the same PDF parsed more than once). The earliest row of each identical set is kept.
const db = require('./src/config/db');

(async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const callBefore = (await client.query('SELECT COUNT(*)::int AS n FROM tbl_telecome_call_logs')).rows[0].n;
    const callDel = await client.query(`
      DELETE FROM tbl_telecome_call_logs
      WHERE log_id IN (
        SELECT log_id FROM (
          SELECT log_id,
                 ROW_NUMBER() OVER (
                   PARTITION BY bill_number, source_number, call_date, call_time,
                                destination_number, duration, category, amount, tele_bill_id
                   ORDER BY log_id
                 ) AS rn
          FROM tbl_telecome_call_logs
        ) t WHERE t.rn > 1
      )`);

    const smsBefore = (await client.query('SELECT COUNT(*)::int AS n FROM tbl_telecome_sms_logs')).rows[0].n;
    const smsDel = await client.query(`
      DELETE FROM tbl_telecome_sms_logs
      WHERE sms_log_id IN (
        SELECT sms_log_id FROM (
          SELECT sms_log_id,
                 ROW_NUMBER() OVER (
                   PARTITION BY bill_number, source_number, destination_number, sms_date,
                                sms_time, sms_type, sms_count, amount, tele_bill_id
                   ORDER BY sms_log_id
                 ) AS rn
          FROM tbl_telecome_sms_logs
        ) t WHERE t.rn > 1
      )`);

    await client.query('COMMIT');
    console.log(`Call logs: ${callBefore} -> ${callBefore - callDel.rowCount} (removed ${callDel.rowCount} duplicates)`);
    console.log(`SMS logs:  ${smsBefore} -> ${smsBefore - smsDel.rowCount} (removed ${smsDel.rowCount} duplicates)`);
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed, nothing changed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
})();
