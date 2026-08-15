const db = require('../config/db');

// Sync existing records from tbl_vehicle_toll into tbl_toll_overview if empty
const autoSyncInitialData = async () => {
  try {
    const checkRes = await db.query('SELECT COUNT(*) FROM tbl_toll_overview');
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      await db.query(`
        INSERT INTO tbl_toll_overview (custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, status, is_deleted, created_at, updated_at)
        SELECT custom_field_id, field_data, clientid, country_id, COALESCE(moduleid, 70), roleid, user_id, company_id, COALESCE(status, 1), COALESCE(is_deleted, false), created_at, updated_at
        FROM tbl_vehicle_toll
        WHERE (is_deleted = false OR is_deleted IS NULL);
      `);
      console.log('Synchronized records from tbl_vehicle_toll to tbl_toll_overview.');
    }
  } catch (err) {
    console.error('Error auto syncing to tbl_toll_overview:', err);
  }
};

// Run initial sync on module load
autoSyncInitialData();

const sanitizeFieldData = (fd) => {
  if (!fd || typeof fd !== 'object') return {};
  const tollNameVal = fd['1786629185586'] || fd['Toll Name'] || fd['TOLL NAME'] || fd['toll_name'];
  const accNoVal = fd['1786629206891'] || fd['Account No'] || fd['ACCOUNT NO'] || fd['account_no'];

  const clean = {};
  for (const [k, v] of Object.entries(fd)) {
    if (/^\d+$/.test(k)) {
      clean[k] = v;
    }
  }
  if (tollNameVal !== undefined && tollNameVal !== null) {
    clean['1786629185586'] = tollNameVal;
  }
  if (accNoVal !== undefined && accNoVal !== null) {
    clean['1786629206891'] = accNoVal;
  }
  return clean;
};

exports.saveTollOverview = async (req, res) => {
  try {
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    const cleanFd = sanitizeFieldData(field_data);
    const jsonData = JSON.stringify(cleanFd);
    
    // Extract Account No / Toll ID value from field_data to check for duplicates
    let tollIdVal = null;
    if (cleanFd) {
      tollIdVal = 
        cleanFd['1786629206891'] || 
        cleanFd['Account No'] || 
        cleanFd['ACCOUNT NO'] || 
        cleanFd['account_no'] || 
        cleanFd.toll_id || 
        cleanFd.ID || 
        cleanFd.id || 
        null;
      if (!tollIdVal) {
        const keys = Object.keys(cleanFd);
        for (const k of keys) {
          if (k !== '1786629185586' && k !== 'toll_name' && String(cleanFd[k]).trim().length > 0) {
            tollIdVal = cleanFd[k];
            break;
          }
        }
      }
    }

    let existingRecordId = null;
    if (tollIdVal && String(tollIdVal).trim() !== '') {
      const checkQuery = `
        SELECT id FROM tbl_toll_overview
        WHERE (is_deleted = false OR is_deleted IS NULL)
          AND (
            field_data->>'Account No' = $1
            OR field_data->>'ACCOUNT NO' = $1
            OR field_data->>'1786629206891' = $1
            OR field_data->>'toll_id' = $1
            OR field_data->>'ID' = $1
          )
        LIMIT 1
      `;
      const existingRes = await db.query(checkQuery, [String(tollIdVal).trim()]);
      if (existingRes.rows.length > 0) {
        existingRecordId = existingRes.rows[0].id;
      }
    }

    if (existingRecordId) {
      // Rule 3: Skip that row if toll_id already exists in database
      return res.status(200).json({
        status: 'skipped',
        skipped: true,
        reason: 'duplicate_entry_exists',
        toll_id: tollIdVal,
        message: 'Duplicate entry exists'
      });
    } else {
      // Insert new record if no duplicate found
      const insertQuery = `
        INSERT INTO tbl_toll_overview (custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const insertValues = [
        custom_field_id || null,
        jsonData,
        clientid || null,
        country_id || null,
        moduleid || 52,
        roleid || null,
        user_id || null,
        company_id || null
      ];
      const result = await db.query(insertQuery, insertValues);
      return res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    // Catch unique constraint violation (code 23505) as duplicate skipped
    if (error.code === '23505' || (error.message && (error.message.includes('unique') || error.message.includes('duplicate')))) {
      return res.status(200).json({
        status: 'skipped',
        skipped: true,
        reason: 'duplicate_entry_exists',
        message: 'Duplicate entry exists'
      });
    }
    console.error('Error saving toll overview:', error);
    res.status(500).json({ message: 'Error saving toll overview', error: error.message });
  }
};

exports.getTollOverviewRecords = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        v.*, 
        (SELECT string_agg(role, ', ') FROM role WHERE v.roleid IS NOT NULL AND id::text = ANY(string_to_array(v.roleid::text, ','))) AS role_name, 
        COALESCE(
          e.full_name, 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = v.roleid::text AND e_fallback.clientid::text = v.clientid::text LIMIT 1)
        ) AS employee_name
      FROM tbl_toll_overview v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN employee e ON u.email = e.email
      WHERE (v.is_deleted = false OR v.is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      query += ' AND v.clientid::text = $1';
      params.push(clientid);
    }
    query += ' ORDER BY v.id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching toll overview records:', error);
    res.status(500).json({ message: 'Error fetching toll overview records' });
  }
};

exports.deleteTollOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'UPDATE tbl_toll_overview SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll overview record not found' });
    }

    res.status(200).json({ message: 'Toll overview record deleted successfully' });
  } catch (error) {
    console.error('Error deleting toll overview:', error);
    res.status(500).json({ message: 'Error deleting toll overview' });
  }
};

exports.updateTollOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    const cleanFd = sanitizeFieldData(field_data);
    const jsonData = JSON.stringify(cleanFd);

    const query = `
      UPDATE tbl_toll_overview
      SET custom_field_id = $1, field_data = $2,
          clientid = $3, country_id = $4, moduleid = $5, roleid = $6, user_id = $7, company_id = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const values = [
      custom_field_id || null,
      jsonData,
      clientid || null,
      country_id || null,
      moduleid || 70,
      roleid || null,
      user_id || null,
      company_id || null,
      id
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll overview record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating toll overview:', error);
    res.status(500).json({ message: 'Error updating toll overview', error: error.message });
  }
};
