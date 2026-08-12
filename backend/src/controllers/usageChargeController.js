const db = require('../config/db');

exports.getAllUsageCharges = async (req, res) => {
  try {
    const { clientid, moduleid } = req.query;
    let query = `
      SELECT 
        uc.*, 
        uc.usage_id AS id,
        c.client_name,
        co.name as country_name
      FROM tbl_tele_usage_charge uc
      LEFT JOIN client c ON (
        CASE 
          WHEN uc.clientid ~ '^[0-9]+$' THEN uc.clientid::integer = c.id
          ELSE false 
        END
      )
      LEFT JOIN country co ON uc.country_id = co.id
      WHERE uc.is_deleted = 0
    `;
    let params = [];
    let paramIndex = 1;
    if (clientid) {
      query += ` AND uc.clientid::text = $${paramIndex++}`;
      params.push(String(clientid));
    }
    if (moduleid) {
      query += ` AND uc.moduleid = $${paramIndex++}`;
      params.push(parseInt(moduleid, 10));
    }
    query += ' ORDER BY uc.usage_id DESC';
    const result = await db.query(query, params);

    const companyRes = await db.query('SELECT id, company_name FROM company WHERE is_deleted = false');
    const companyMap = new Map();
    (companyRes.rows || []).forEach(comp => companyMap.set(String(comp.id), comp.company_name));

    const formattedRows = result.rows.map(row => {
      let compName = row.company_id || '';
      if (companyMap.has(String(compName))) {
        compName = companyMap.get(String(compName));
      }
      if (!compName && row.field_data) {
        const fd = typeof row.field_data === 'string' ? JSON.parse(row.field_data) : row.field_data;
        compName = fd.Company || fd.company_name || '';
      }
      return {
        ...row,
        company_name: compName
      };
    });

    res.status(200).json(formattedRows);
  } catch (err) {
    console.error('Error fetching Usage Charges:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getUsageChargeById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT uc.*, uc.usage_id AS id, c.client_name, co.name as country_name
      FROM tbl_tele_usage_charge uc
      LEFT JOIN client c ON (
        CASE 
          WHEN uc.clientid ~ '^[0-9]+$' THEN uc.clientid::integer = c.id
          ELSE false 
        END
      )
      LEFT JOIN country co ON uc.country_id = co.id
      WHERE uc.usage_id = $1 AND uc.is_deleted = 0
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usage charge record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching Usage Charge by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createUsageCharge = async (req, res) => {
  try {
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status } = req.body;

    const result = await db.query(
      `INSERT INTO tbl_tele_usage_charge 
        (custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status, is_deleted, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *, usage_id AS id`,
      [
        custom_field_id || null,
        field_data ? JSON.stringify(field_data) : '{}',
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : 1,
        moduleid || 57,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        status || 'Active'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating Usage Charge:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateUsageCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status } = req.body;

    const result = await db.query(
      `UPDATE tbl_tele_usage_charge 
       SET custom_field_id = COALESCE($1, custom_field_id),
           field_data = COALESCE($2, field_data),
           clientid = COALESCE($3, clientid),
           country_id = COALESCE($4, country_id),
           moduleid = COALESCE($5, moduleid),
           user_id = COALESCE($6, user_id),
           company_id = COALESCE($7, company_id),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE usage_id = $9 AND is_deleted = 0 
       RETURNING *, usage_id AS id`,
      [
        custom_field_id || null,
        field_data ? JSON.stringify(field_data) : null,
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : null,
        moduleid || null,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        status || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usage charge record not found or deleted' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating Usage Charge:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteUsageCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE tbl_tele_usage_charge 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE usage_id = $1 RETURNING *, usage_id AS id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usage charge record not found' });
    }

    res.status(200).json({ message: 'Usage charge record deleted successfully' });
  } catch (err) {
    console.error('Error deleting Usage Charge:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
