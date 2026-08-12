const db = require('../config/db');

exports.getAllTelecomBills = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        tb.*, 
        tb.tele_bill_id AS id,
        c.client_name,
        co.name as country_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON (
        CASE 
          WHEN tb.clientid ~ '^[0-9]+$' THEN tb.clientid::integer = c.id
          ELSE false 
        END
      )
      LEFT JOIN country co ON tb.country_id = co.id
      WHERE tb.is_deleted = 0
    `;
    let params = [];
    if (clientid) {
      query += ' AND tb.clientid::text = $1';
      params.push(String(clientid));
    }
    query += ' ORDER BY tb.tele_bill_id DESC';
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
    console.error('Error fetching Telecom Bills:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT tb.*, tb.tele_bill_id AS id, c.client_name, co.name as country_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON tb.clientid::integer = c.id
      LEFT JOIN country co ON tb.country_id = co.id
      WHERE tb.tele_bill_id = $1 AND tb.is_deleted = 0
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching Telecom Bill by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createTelecomBill = async (req, res) => {
  try {
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status } = req.body;

    const result = await db.query(
      `INSERT INTO tbl_telecome_bill 
        (custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status, is_deleted, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *, tele_bill_id AS id`,
      [
        custom_field_id || null,
        field_data ? JSON.stringify(field_data) : '{}',
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : null,
        moduleid || 56,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        status || 'Pending'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateTelecomBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status } = req.body;

    const result = await db.query(
      `UPDATE tbl_telecome_bill 
       SET custom_field_id = COALESCE($1, custom_field_id),
           field_data = COALESCE($2, field_data),
           clientid = COALESCE($3, clientid),
           country_id = COALESCE($4, country_id),
           moduleid = COALESCE($5, moduleid),
           user_id = COALESCE($6, user_id),
           company_id = COALESCE($7, company_id),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE tele_bill_id = $9 AND is_deleted = 0 
       RETURNING *, tele_bill_id AS id`,
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
      return res.status(404).json({ message: 'Telecom Bill record not found or deleted' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteTelecomBill = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE tbl_telecome_bill 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE tele_bill_id = $1 RETURNING *, tele_bill_id AS id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }

    res.status(200).json({ message: 'Telecom Bill record deleted successfully' });
  } catch (err) {
    console.error('Error deleting Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
