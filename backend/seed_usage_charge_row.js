const db = require('./src/config/db');

async function seedRecord() {
  try {
    const sampleRecord = {
      custom_field_id: 37,
      field_data: JSON.stringify({
        'Bill Number': 'BILL-2026-001',
        'Mobile Number': '0501234567',
        'Usage Date': '2026-08-01',
        'Time': '14:30',
        'Usage Type': 'Local Call',
        'Called / Destination Number': '0551239876',
        'Country': 'United Arab Emirates',
        'Duration': '05:20',
        'Units': '1',
        'Amount': '15.50',
        'Remarks': 'Local business call'
      }),
      clientid: '1',
      country_id: 1,
      company_id: 'Night to Night',
      moduleid: 57,
      status: 'Active'
    };

    const res = await db.query(`
      INSERT INTO tbl_tele_usage_charge 
        (custom_field_id, field_data, clientid, country_id, company_id, moduleid, status, is_deleted, created_at, updated_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      sampleRecord.custom_field_id,
      sampleRecord.field_data,
      sampleRecord.clientid,
      sampleRecord.country_id,
      sampleRecord.company_id,
      sampleRecord.moduleid,
      sampleRecord.status
    ]);

    console.log('Inserted row with usage_id:', res.rows[0]);
  } catch (err) {
    console.error('Error inserting row:', err);
  } finally {
    process.exit();
  }
}

seedRecord();
