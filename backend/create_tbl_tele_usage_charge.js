const db = require('./src/config/db');

async function createTeleUsageChargeTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tbl_tele_usage_charge (
        id SERIAL PRIMARY KEY,
        custom_field_id INT,
        field_data JSONB DEFAULT '{}'::jsonb,
        clientid VARCHAR(100),
        country_id INT DEFAULT 1,
        company_id VARCHAR(255),
        moduleid INT DEFAULT 57,
        user_id INT,
        status VARCHAR(50) DEFAULT 'Active',
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createTableQuery);
    console.log('Successfully created database table: tbl_tele_usage_charge');

    // Also seed initial sample records if empty
    const checkCount = await db.query('SELECT COUNT(*) FROM tbl_tele_usage_charge');
    if (parseInt(checkCount.rows[0].count, 10) === 0) {
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

      await db.query(`
        INSERT INTO tbl_tele_usage_charge 
          (custom_field_id, field_data, clientid, country_id, company_id, moduleid, status, is_deleted, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        sampleRecord.custom_field_id,
        sampleRecord.field_data,
        sampleRecord.clientid,
        sampleRecord.country_id,
        sampleRecord.company_id,
        sampleRecord.moduleid,
        sampleRecord.status
      ]);
      console.log('Successfully inserted initial sample record into tbl_tele_usage_charge');
    }
  } catch (err) {
    console.error('Error creating table tbl_tele_usage_charge:', err);
  } finally {
    process.exit();
  }
}

createTeleUsageChargeTable();
