const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

function extractTollOverviewTitle(fieldData, fallbackId) {
  if (!fieldData || typeof fieldData !== 'object') return `Toll Account #${fallbackId}`;
  const tollName = fieldData['1786788666800'] || fieldData['1786629185586'] || fieldData['Toll Name'] || fieldData['TOLL NAME'] || fieldData['toll_name'] || '';
  const accNo = fieldData['1786788673616'] || fieldData['1786629206891'] || fieldData['Account No'] || fieldData['ACCOUNT NO'] || fieldData['account_no'] || fieldData['toll_id'] || '';

  if (tollName && accNo) return `${tollName} - Acc #${accNo}`;
  if (tollName) return String(tollName);
  if (accNo) return `Acc #${accNo}`;

  const vals = Object.values(fieldData).filter(v => typeof v === 'string' && v.trim().length > 0 && !v.includes('http') && !v.includes('/'));
  if (vals.length > 0) return vals[0];
  return `Toll Account #${fallbackId}`;
}

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
  const tollNameVal = fd['1786788666800'] || fd['1786629185586'] || fd['Toll Name'] || fd['TOLL NAME'] || fd['toll_name'];
  const accNoVal = fd['1786788673616'] || fd['1786629206891'] || fd['Account No'] || fd['ACCOUNT NO'] || fd['account_no'];

  const clean = {};
  for (const [k, v] of Object.entries(fd)) {
    if (/^\d+$/.test(k)) {
      clean[k] = v;
    }
  }
  if (tollNameVal !== undefined && tollNameVal !== null) {
    clean['1786788666800'] = tollNameVal;
    clean['1786629185586'] = tollNameVal;
  }
  if (accNoVal !== undefined && accNoVal !== null) {
    clean['1786788673616'] = accNoVal;
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
        cleanFd['1786788673616'] || 
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
          if (k !== '1786788666800' && k !== '1786629185586' && k !== 'toll_name' && String(cleanFd[k]).trim().length > 0) {
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
            OR field_data->>'1786788673616' = $1
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
      const savedRecord = result.rows[0];

      // Log Creation Audit
      try {
        const vTitle = extractTollOverviewTitle(cleanFd, savedRecord.id);
        logAudit({
          req,
          clientid: clientid || savedRecord.clientid,
          company_id: company_id || savedRecord.company_id,
          module_name: 'VEHICLE_TOLL_OVERVIEW',
          record_id: savedRecord.id,
          record_title: vTitle,
          action_type: 'CREATE',
          action_summary: `Created toll overview account: ${vTitle}`,
          new_data: cleanFd
        }).catch(e => console.error('[AUDIT] Failed to log toll overview creation:', e.message));
      } catch (e) {
        console.error('[AUDIT] Error preparing toll overview create log:', e.message);
      }

      return res.status(201).json(savedRecord);
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
    const { clientid, company_id } = req.query;
    let query = `
      SELECT 
        v.*, 
        comp.company_name AS company_name,
        (SELECT string_agg(role, ', ') FROM role WHERE v.roleid IS NOT NULL AND id::text = ANY(string_to_array(v.roleid::text, ','))) AS role_name, 
        COALESCE(
          (SELECT full_name FROM employee e WHERE LOWER(TRIM(e.email)) = LOWER(TRIM(u.email)) AND (e.is_deleted = false OR e.is_deleted IS NULL) ORDER BY e.id DESC LIMIT 1), 
          (SELECT client_name FROM client c WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)) AND (c.isdelete = false OR c.isdelete IS NULL) ORDER BY c.id DESC LIMIT 1), 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = v.roleid::text AND e_fallback.clientid::text = v.clientid::text AND (e_fallback.is_deleted = false OR e_fallback.is_deleted IS NULL) ORDER BY e_fallback.id DESC LIMIT 1)
        ) AS employee_name
      FROM tbl_toll_overview v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN company comp ON v.company_id::text = comp.id::text
      WHERE (v.is_deleted = false OR v.is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      params.push(clientid);
      query += ` AND v.clientid::text = $${params.length}`;
    }
    if (company_id) {
      params.push(company_id);
      query += ` AND v.company_id::text = $${params.length}`;
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

    // Fetch existing record before deletion for audit trail
    const selectQuery = 'SELECT * FROM tbl_toll_overview WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Toll overview record not found' });
    }

    const existingRecord = selectResult.rows[0];
    const oldFieldData = existingRecord.field_data;

    const query = 'UPDATE tbl_toll_overview SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    // Log Deletion Audit
    try {
      const oldParsed = typeof oldFieldData === 'string' ? JSON.parse(oldFieldData) : (oldFieldData || {});
      const vTitle = extractTollOverviewTitle(oldParsed, id);
      logAudit({
        req,
        clientid: existingRecord.clientid,
        company_id: existingRecord.company_id,
        module_name: 'VEHICLE_TOLL_OVERVIEW',
        record_id: id,
        record_title: vTitle,
        action_type: 'DELETE',
        action_summary: `Deleted toll overview account: ${vTitle}`,
        old_data: oldParsed
      }).catch(e => console.error('[AUDIT] Failed to log toll overview deletion:', e.message));
    } catch (e) {
      console.error('[AUDIT] Error preparing toll overview delete log:', e.message);
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

    // Fetch existing record to capture old values for diff audit
    const selectQuery = 'SELECT * FROM tbl_toll_overview WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Toll overview record not found' });
    }

    const existingRecord = selectResult.rows[0];
    const oldFieldData = existingRecord.field_data;

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
      clientid || existingRecord.clientid || null,
      country_id || existingRecord.country_id || null,
      moduleid || existingRecord.moduleid || 70,
      roleid || existingRecord.roleid || null,
      user_id || existingRecord.user_id || null,
      company_id || existingRecord.company_id || null,
      id
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll overview record not found' });
    }

    const updatedRecord = result.rows[0];

    // Log Update Audit
    try {
      const oldParsed = typeof oldFieldData === 'string' ? JSON.parse(oldFieldData) : (oldFieldData || {});
      const vTitle = extractTollOverviewTitle(cleanFd, id);
      logAudit({
        req,
        clientid: clientid || existingRecord.clientid,
        company_id: company_id || existingRecord.company_id,
        module_name: 'VEHICLE_TOLL_OVERVIEW',
        record_id: id,
        record_title: vTitle,
        action_type: 'UPDATE',
        action_summary: `Updated toll overview account: ${vTitle}`,
        old_data: oldParsed,
        new_data: cleanFd
      }).catch(e => console.error('[AUDIT] Failed to log toll overview update:', e.message));
    } catch (e) {
      console.error('[AUDIT] Error preparing toll overview update log:', e.message);
    }

    res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating toll overview:', error);
    res.status(500).json({ message: 'Error updating toll overview', error: error.message });
  }
};
