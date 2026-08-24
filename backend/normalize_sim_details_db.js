const db = require('./src/config/db');

async function runMigration() {
  try {
    const res = await db.query('SELECT tele_id, field_data FROM tbl_sim_details WHERE is_deleted = 0');
    console.log(`Found ${res.rows.length} active SIM detail records.`);

    for (const row of res.rows) {
      let fd = row.field_data;
      if (typeof fd === 'string') {
        try { fd = JSON.parse(fd); } catch (e) { fd = {}; }
      }
      if (!fd || typeof fd !== 'object') fd = {};

      // Unpack nested field_data if present
      if (fd && typeof fd.field_data === 'string') {
        try { fd = { ...fd, ...JSON.parse(fd.field_data) }; } catch (e) {}
      } else if (fd && typeof fd.field_data === 'object' && fd.field_data !== null) {
        fd = { ...fd, ...fd.field_data };
      }

      // Extract plan_name
      let planName =
        fd.plan_name ||
        fd['Plan Name'] ||
        fd['Package Plan'] ||
        fd['Package Plan '] ||
        fd.package_plan ||
        fd.sim_plan ||
        fd['1786100996941'] ||
        null;

      if (!planName) {
        for (const [k, v] of Object.entries(fd)) {
          if (!v || typeof v === 'object') continue;
          const lk = k.trim().toLowerCase();
          if ((lk.includes('plan') || lk.includes('package')) && !lk.includes('amount') && !lk.includes('cost') && !lk.includes('rental')) {
            const sv = String(v).trim();
            if (sv && sv !== 'null' && sv !== 'undefined') {
              planName = sv;
              break;
            }
          }
        }
      }

      // Extract monthly_plan_amount
      let monthlyAmount =
        fd.monthly_plan_amount ||
        fd.monthly_amount ||
        fd['Monthly Plan Amount'] ||
        fd['Monthly Plan Amount '] ||
        fd['Monthly Amount'] ||
        fd['Plan Amount'] ||
        fd['Monthly Rental'] ||
        fd['1786101020492'] ||
        null;

      if (!monthlyAmount) {
        for (const [k, v] of Object.entries(fd)) {
          if (v === undefined || v === null || typeof v === 'object') continue;
          const lk = k.trim().toLowerCase();
          if (lk.includes('monthly') || lk.includes('rental') || (lk.includes('plan') && (lk.includes('amount') || lk.includes('cost') || lk.includes('price')))) {
            const sv = String(v).trim();
            if (sv && sv !== 'null' && sv !== 'undefined') {
              monthlyAmount = sv;
              break;
            }
          }
        }
      }

      // Set explicit standard keys
      if (planName) {
        fd['plan_name'] = planName;
        fd['Package Plan'] = planName;
        fd['Plan Name'] = planName;
      }
      if (monthlyAmount) {
        fd['monthly_plan_amount'] = monthlyAmount;
        fd['Monthly Plan Amount'] = monthlyAmount;
      }

      await db.query(
        'UPDATE tbl_sim_details SET field_data = $1 WHERE tele_id = $2',
        [JSON.stringify(fd), row.tele_id]
      );
      console.log(`Updated tele_id ${row.tele_id}: plan_name='${planName}', monthly_plan_amount='${monthlyAmount}'`);
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

runMigration();
