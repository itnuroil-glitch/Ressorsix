const db = require('./src/config/db');

async function createTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_company_license_auth (
        id SERIAL PRIMARY KEY,
        authority_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('tbl_company_license_auth created successfully!');

    // Seed default authorities if empty
    const checkRes = await db.query(`SELECT COUNT(*) FROM tbl_company_license_auth WHERE is_deleted = 0`);
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const defaultAuthorities = [
        'Department of Economy and Tourism (DET - Dubai)',
        'Abu Dhabi Department of Economic Development (ADDED)',
        'Sharjah Economic Development Department (SEDD)',
        'Dubai Multi Commodities Centre (DMCC)',
        'Dubai International Financial Centre (DIFC)',
        'Jebel Ali Free Zone Authority (JAFZA)',
        'Ras Al Khaimah Economic Zone (RAKEZ)',
        'Abu Dhabi Global Market (ADGM)',
        'Dubai Development Authority (DDA)',
        'Dubai Silicon Oasis Authority (DSO)'
      ];
      for (const name of defaultAuthorities) {
        await db.query(
          `INSERT INTO tbl_company_license_auth (authority_name, status, is_deleted) VALUES ($1, $2, 0)`,
          [name, 'Active']
        );
      }
      console.log('Seeded default licensing authorities into tbl_company_license_auth');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error creating table tbl_company_license_auth:', err);
    process.exit(1);
  }
}

createTable();
