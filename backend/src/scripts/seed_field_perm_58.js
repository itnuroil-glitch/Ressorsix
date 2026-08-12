const db = require('../config/db');

async function seedFieldPermissions58() {
  try {
    const permitted = {
      f_bill_no: true,
      f_mobile: true,
      f_date: true,
      f_time: true,
      f_premium_type: true,
      f_dest: true,
      f_country: true,
      '1786186343653': true,
      '1786186363773': true,
      '1786186379328': true
    };

    const clientsRes = await db.query('SELECT id FROM client');
    for (const row of clientsRes.rows) {
      const clientId = row.id;
      const checkRes = await db.query(
        'SELECT id FROM tbl_feild_permision WHERE clientid = $1 AND moduleid = 58 AND country_id = 1',
        [clientId]
      );
      if (checkRes.rows.length === 0) {
        await db.query(
          'INSERT INTO tbl_feild_permision (clientid, moduleid, country_id, permitted_fields) VALUES ($1, 58, 1, $2)',
          [clientId, JSON.stringify(permitted)]
        );
        console.log(`Inserted field permission for client ${clientId}, module 58`);
      } else {
        await db.query(
          'UPDATE tbl_feild_permision SET permitted_fields = $1 WHERE id = $2',
          [JSON.stringify(permitted), checkRes.rows[0].id]
        );
        console.log(`Updated field permission for client ${clientId}, module 58`);
      }
    }
    console.log('Successfully seeded field permissions for module 58 (Premium / Extra Charges)');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding field permissions:', err);
    process.exit(1);
  }
}

seedFieldPermissions58();
