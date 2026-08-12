const db = require('./src/config/db');

async function backfillTelecomData() {
  try {
    const fetchQuery = `SELECT id, extracted_data FROM tbl_telecome_data WHERE is_deleted = 0;`;
    const res = await db.query(fetchQuery);

    for (const row of res.rows) {
      let ed = {};
      try {
        ed = typeof row.extracted_data === 'string' ? JSON.parse(row.extracted_data) : (row.extracted_data || {});
      } catch (e) {
        ed = {};
      }

      const bill_number = ed.bill_number || ed.doc_number || null;
      const mobile_number = ed.mobile_account || ed.mobile_number || null;
      const telecom_provider = ed.telecom_provider || null;
      const period_from = ed.period_from || ed.bill_period_from || null;
      const period_to = ed.period_to || ed.bill_period_to || null;
      const issue_date = ed.issue_date || null;
      const due_date = ed.due_date || ed.expiry_date || null;
      const service_rental = ed.service_rental ? parseFloat(ed.service_rental) : 0;
      const usage_charges = ed.usage_charges ? parseFloat(ed.usage_charges) : 0;
      const one_time_charges = ed.one_time_charges ? parseFloat(ed.one_time_charges) : 0;
      const other_charges = ed.other_charges ? parseFloat(ed.other_charges) : 0;
      const vat = ed.vat ? parseFloat(ed.vat) : 0;
      const total_amount = ed.total_amount ? parseFloat(ed.total_amount) : 0;

      await db.query(
        `UPDATE tbl_telecome_data
         SET bill_number = COALESCE($1, bill_number),
             mobile_number = COALESCE($2, mobile_number),
             telecom_provider = COALESCE($3, telecom_provider),
             period_from = COALESCE($4, period_from),
             period_to = COALESCE($5, period_to),
             issue_date = COALESCE($6, issue_date),
             due_date = COALESCE($7, due_date),
             service_rental = $8,
             usage_charges = $9,
             one_time_charges = $10,
             other_charges = $11,
             vat = $12,
             total_amount = $13
         WHERE id = $14`,
        [
          bill_number, mobile_number, telecom_provider, period_from, period_to,
          issue_date, due_date, service_rental, usage_charges, one_time_charges,
          other_charges, vat, total_amount, row.id
        ]
      );
    }
    console.log('Successfully backfilled existing rows in tbl_telecome_data with explicit relational values.');
  } catch (err) {
    console.error('Error backfilling tbl_telecome_data:', err);
  } finally {
    process.exit();
  }
}

backfillTelecomData();
