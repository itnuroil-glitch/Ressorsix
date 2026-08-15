const db = require('../config/db');

// Ensure tbl_company_license_auth table exists
const initTable = async () => {
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

    // Check if table is empty, seed default UAE Licensing Authorities
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
  } catch (err) {
    console.error('Error initializing tbl_company_license_auth:', err);
  }
};

initTable();

exports.getAllCompanyLicenseAuth = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_company_license_auth 
      WHERE is_deleted = 0 
    `;
    let params = [];
    if (clientId) {
      queryText += ` AND (client_id = $1 OR client_id IS NULL)`;
      params.push(clientId);
    }
    queryText += ` ORDER BY id ASC`;
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching company licensing authorities:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getCompanyLicenseAuthById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_company_license_auth WHERE id = $1 AND is_deleted = 0', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company licensing authority not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company licensing authority by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createCompanyLicenseAuth = async (req, res) => {
  try {
    const { authority_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!authority_name || !authority_name.trim()) {
      return res.status(400).json({ message: 'Authority name is required.' });
    }

    const authList = authority_name
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (authList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid authority name(s).' });
    }

    const insertedAuths = [];
    const skippedAuths = [];

    for (const item of authList) {
      let checkQuery = `SELECT * FROM tbl_company_license_auth WHERE LOWER(authority_name) = LOWER($1) AND is_deleted = 0`;
      let checkParams = [item];
      if (clientId) {
        checkQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        checkParams.push(clientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        skippedAuths.push(item);
        continue;
      }

      const queryText = `
        INSERT INTO tbl_company_license_auth (authority_name, status, client_id, is_deleted)
        VALUES ($1, $2, $3, 0)
        RETURNING *
      `;
      const result = await db.query(queryText, [
        item,
        status || 'Active',
        clientId || null
      ]);
      insertedAuths.push(result.rows[0]);
    }

    if (insertedAuths.length === 0 && skippedAuths.length > 0) {
      return res.status(409).json({
        message: `Authority name(s) already exist: ${skippedAuths.join(', ')}`
      });
    }

    const message = insertedAuths.length === 1
      ? 'Company licensing authority created successfully.'
      : `${insertedAuths.length} Company licensing authorities created successfully.${skippedAuths.length > 0 ? ` (${skippedAuths.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      licenseAuth: insertedAuths[0],
      insertedAuths,
      skippedAuths
    });
  } catch (error) {
    console.error('Error creating company licensing authority:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateCompanyLicenseAuth = async (req, res) => {
  try {
    const { id } = req.params;
    const { authority_name, status } = req.body;

    let trimmedName = authority_name ? authority_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_company_license_auth WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_company_license_auth WHERE LOWER(authority_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A licensing authority with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_company_license_auth
      SET authority_name = COALESCE($1, authority_name),
          status = COALESCE($2, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_deleted = 0
      RETURNING *
    `;
    const result = await db.query(queryText, [
      trimmedName,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company licensing authority not found or deleted.' });
    }

    res.status(200).json({
      message: 'Company licensing authority updated successfully.',
      licenseAuth: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating company licensing authority:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteCompanyLicenseAuth = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_company_license_auth
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company licensing authority not found.' });
    }

    res.status(200).json({ message: 'Company licensing authority deleted successfully.' });
  } catch (error) {
    console.error('Error deleting company licensing authority:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
