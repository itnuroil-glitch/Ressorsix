const db = require('./src/config/db');

async function fixMasterBills() {
  try {
    console.log('Updating master bill headers in tbl_telecome_bill...');

    // Etisalat Bill (Bill #3)
    await db.query(`
      UPDATE tbl_telecome_bill 
      SET total_bill = 283.05, 
          plan_rental = 200.00, 
          usage_charges = 72.20, 
          vat_current_period = 10.85 
      WHERE tele_bill_id = 3
    `);

    // du Bill (Bill #4)
    await db.query(`
      UPDATE tbl_telecome_bill 
      SET mobile_number = '0524806401', 
          total_bill = 1013.98, 
          plan_rental = 630.00, 
          usage_charges = 344.12, 
          vat_current_period = 39.86 
      WHERE tele_bill_id = 4
    `);

    const res = await db.query(`
      SELECT tele_bill_id, bill_number, mobile_number, company_name, telecom_provider, total_bill, plan_rental, usage_charges, vat_current_period 
      FROM tbl_telecome_bill 
      ORDER BY tele_bill_id ASC
    `);

    console.log('--- UPDATED POSTGRESQL TABLE: tbl_telecome_bill ---');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error updating master bills:', err);
    process.exit(1);
  }
}

fixMasterBills();
