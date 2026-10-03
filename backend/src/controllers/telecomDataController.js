const db = require('../config/db');

// Helper to log telecom actions
const logTelecomAction = async (telecomId, action, performedBy, oldData, newData) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_telecom_logs (
        id SERIAL PRIMARY KEY,
        telecom_id INTEGER,
        action VARCHAR(50),
        performed_by VARCHAR(255),
        old_data JSONB,
        new_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      INSERT INTO tbl_telecom_logs (telecom_id, action, performed_by, old_data, new_data)
      VALUES ($1, $2, $3, $4, $5)
    `, [telecomId, action, performedBy, oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null]);
  } catch (err) {
    console.error('Error logging telecom action:', err);
  }
};

// Helper to dynamically alter table and create missing column heads in tbl_telecome_data
const ensureColumnsExist = async (dataMap) => {
  try {
    const res = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_data'`
    );
    const existingCols = new Set(res.rows.map(r => r.column_name.toLowerCase()));

    for (const rawKey of Object.keys(dataMap)) {
      const val = dataMap[rawKey];
      if (!rawKey || (typeof val === 'object' && val !== null)) continue; // Skip nested objects
      const colName = rawKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (!colName || colName === 'id' || existingCols.has(colName)) continue;

      try {
        await db.query(`ALTER TABLE tbl_telecome_data ADD COLUMN IF NOT EXISTS "${colName}" VARCHAR(255);`);
        existingCols.add(colName);
        console.log(`Auto-added new column header to tbl_telecome_data: "${colName}"`);
      } catch (e) {
        console.warn(`Could not add column ${colName}:`, e.message);
      }
    }
  } catch (err) {
    console.error('Error in ensureColumnsExist:', err);
  }
};

exports.getAllTelecomData = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        td.*, 
        td.id AS id,
        c.client_name,
        co.name as country_name,
        (
          SELECT string_agg(company_name, ', ') 
          FROM company 
          WHERE id = ANY(string_to_array(nullif(td.company_id, ''), ',')::integer[])
        ) AS company_name
      FROM tbl_telecome_data td
      LEFT JOIN client c ON td.clientid::integer = c.id
      LEFT JOIN country co ON td.country_id = co.id
      WHERE td.is_deleted = 0
    `;
    let params = [];
    if (clientid) {
      query += ' AND td.clientid::text = $1';
      params.push(String(clientid));
    }
    query += ' ORDER BY td.id DESC';
    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching Telecom Data:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomDataById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT td.*, td.id AS id, c.client_name, co.name as country_name
      FROM tbl_telecome_data td
      LEFT JOIN client c ON td.clientid::integer = c.id
      LEFT JOIN country co ON td.country_id = co.id
      WHERE td.id = $1 AND td.is_deleted = 0
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Data record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching Telecom Data by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createTelecomData = async (req, res) => {
  try {
    const body = req.body || {};
    const ed = typeof body.extracted_data === 'object' && body.extracted_data !== null ? body.extracted_data : {};
    
    // Combine extracted_data and body fields
    const dataMap = { ...ed, ...body };
    delete dataMap.extracted_data;
    delete dataMap.field_data;
    delete dataMap.dynamic_field_map;

    // Standard defaults
    if (!dataMap.moduleid) dataMap.moduleid = '59';
    if (!dataMap.country_id) dataMap.country_id = '1';
    if (!dataMap.status) dataMap.status = 'Active';
    if (dataMap.is_deleted === undefined) dataMap.is_deleted = '0';

    // 1. Auto-create missing column heads in tbl_telecome_data
    await ensureColumnsExist(dataMap);

    // 2. Fetch verified active table column list
    const colRes = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_data'`
    );
    const validCols = new Set(colRes.rows.map(r => r.column_name.toLowerCase()));

    // 3. Build dynamic insert query
    const insertCols = [];
    const values = [];
    const placeholders = [];

    let paramIdx = 1;
    for (const rawKey of Object.keys(dataMap)) {
      const val = dataMap[rawKey];
      if (typeof val === 'object' && val !== null) continue;

      const colName = rawKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (!colName || colName === 'id') continue;
      if (!validCols.has(colName)) continue; // Only insert into columns that actually exist

      insertCols.push(`"${colName}"`);
      values.push(val !== undefined && val !== null ? String(val) : null);
      placeholders.push(`$${paramIdx}`);
      paramIdx++;
    }

    if (insertCols.length === 0) {
      return res.status(400).json({ error: 'No valid data fields provided for insertion' });
    }

    const query = `
      INSERT INTO tbl_telecome_data (${insertCols.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *;
    `;

    const result = await db.query(query, values);
    
    // Log creation
    await logTelecomAction(result.rows[0].id, 'CREATED', body.user_name || 'System', null, result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating Telecom Data:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateTelecomData = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const ed = typeof body.extracted_data === 'object' && body.extracted_data !== null ? body.extracted_data : {};

    const dataMap = { ...ed, ...body };
    delete dataMap.extracted_data;
    delete dataMap.field_data;
    delete dataMap.dynamic_field_map;

    await ensureColumnsExist(dataMap);

    const colRes = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_data'`
    );
    const validCols = new Set(colRes.rows.map(r => r.column_name.toLowerCase()));

    // Fetch old data for logging
    const oldRecordRes = await db.query('SELECT * FROM tbl_telecome_data WHERE id = $1', [id]);
    const oldData = oldRecordRes.rows[0];


    const updateClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const rawKey of Object.keys(dataMap)) {
      const val = dataMap[rawKey];
      if (typeof val === 'object' && val !== null) continue;

      const colName = rawKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (!colName || colName === 'id') continue;
      if (!validCols.has(colName)) continue;

      updateClauses.push(`"${colName}" = $${paramIdx}`);
      values.push(val !== undefined && val !== null ? String(val) : null);
      paramIdx++;
    }

    if (updateClauses.length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    values.push(id);
    const query = `
      UPDATE tbl_telecome_data 
      SET ${updateClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIdx} AND is_deleted = 0 
      RETURNING *;
    `;

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Data record not found or deleted' });
    }

    // Log update
    await logTelecomAction(id, 'UPDATED', body.user_name || 'System', oldData, result.rows[0]);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating Telecom Data:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteTelecomData = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch old data for logging before deleting
    const oldRecordRes = await db.query('SELECT * FROM tbl_telecome_data WHERE id = $1', [id]);
    const oldData = oldRecordRes.rows[0];

    const result = await db.query(
      `UPDATE tbl_telecome_data 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Data record not found' });
    }

    // Log deletion
    await logTelecomAction(id, 'DELETED', req.body.user_name || 'System', oldData, result.rows[0]);

    res.status(200).json({ message: 'Telecom Data record deleted successfully' });
  } catch (err) {
    console.error('Error deleting Telecom Data:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomLogs = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ensure table exists before querying
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_telecom_logs (
        id SERIAL PRIMARY KEY,
        telecom_id INTEGER,
        action VARCHAR(50),
        performed_by VARCHAR(255),
        old_data JSONB,
        new_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await db.query(
      `SELECT * FROM tbl_telecom_logs WHERE telecom_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching Telecom Logs:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getAllTelecomLogs = async (req, res) => {
  try {
    const { limit = 100, clientid, company_id } = req.query;
    let query = `
      SELECT l.*
      FROM tbl_telecom_logs l
      ORDER BY l.created_at DESC LIMIT $1
    `;
    const params = [parseInt(limit, 10)];
    // Ideally we filter by clientid/company_id if t is available, but keeping it simple
    
    const result = await db.query(query, params);
    
    // Format to match audit history response so frontend works as is
    const formattedData = result.rows.map(row => {
      let changed_fields = {};
      if (row.action === 'UPDATED' && row.old_data && row.new_data) {
        for (const key in row.new_data) {
          if (key === 'updated_at' || key === 'created_at') continue;
          if (JSON.stringify(row.old_data[key]) !== JSON.stringify(row.new_data[key])) {
            changed_fields[key] = {
              old: row.old_data[key],
              new: row.new_data[key]
            };
          }
        }
      }
      // Safely extract a title from the JSON data
      let recTitle = `Record #${row.telecom_id}`;
      const jsonSource = row.new_data || row.old_data || {};
      if (jsonSource.account_number) {
        recTitle = String(jsonSource.account_number);
      } else if (jsonSource.sim_number) {
        recTitle = String(jsonSource.sim_number);
      }

      return {
        id: row.id,
        record_id: row.telecom_id,
        record_title: recTitle,
        action_type: row.action,
        action_summary: `${row.action} performed on ${recTitle}`,
        changed_fields: changed_fields,
        user_name: row.performed_by,
        user_email: null,
        user_role: null,
        created_at: row.created_at
      };
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error('Error fetching all Telecom Logs:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
