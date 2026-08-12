const db = require('../config/db');

exports.getAllTeleDocuments = async (req, res) => {
  try {
    const { clientid, moduleid } = req.query;
    let query = `
      SELECT 
        doc.*, 
        doc.id AS doc_id,
        c.client_name,
        co.name as country_name
      FROM tbl_tele_document doc
      LEFT JOIN client c ON (
        CASE 
          WHEN doc.clientid ~ '^[0-9]+$' THEN doc.clientid::integer = c.id
          ELSE false 
        END
      )
      LEFT JOIN country co ON doc.country_id = co.id
      WHERE doc.is_deleted = 0
    `;
    let params = [];
    let paramIndex = 1;
    if (clientid) {
      query += ` AND doc.clientid::text = $${paramIndex++}`;
      params.push(String(clientid));
    }
    if (moduleid) {
      query += ` AND doc.moduleid = $${paramIndex++}`;
      params.push(parseInt(moduleid, 10));
    }
    query += ' ORDER BY doc.id DESC';
    const result = await db.query(query, params);

    const companyRes = await db.query('SELECT id, company_name FROM company WHERE is_deleted = false');
    const companyMap = new Map();
    (companyRes.rows || []).forEach(comp => companyMap.set(String(comp.id), comp.company_name));

    const formattedRows = result.rows.map(row => {
      let compName = row.company || row.company_id || '';
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
    console.error('Error fetching Telecom Documents:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTeleDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT doc.*, doc.id AS doc_id, c.client_name, co.name as country_name
      FROM tbl_tele_document doc
      LEFT JOIN client c ON (
        CASE 
          WHEN doc.clientid ~ '^[0-9]+$' THEN doc.clientid::integer = c.id
          ELSE false 
        END
      )
      LEFT JOIN country co ON doc.country_id = co.id
      WHERE doc.id = $1 AND doc.is_deleted = 0
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Document record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching Telecom Document by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createTeleDocument = async (req, res) => {
  try {
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, company, mobile_account, document_type, document_number, issue_date, expiry_date, file_upload, remarks, status } = req.body;

    const result = await db.query(
      `INSERT INTO tbl_tele_document 
        (custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, company, mobile_account, document_type, document_number, issue_date, expiry_date, file_upload, remarks, status, is_deleted, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [
        custom_field_id || null,
        field_data ? JSON.stringify(field_data) : '{}',
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : 1,
        moduleid || 61,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        company || null,
        mobile_account || null,
        document_type || null,
        document_number || null,
        issue_date || null,
        expiry_date || null,
        file_upload || null,
        remarks || null,
        status || 'Active'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating Telecom Document:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateTeleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, company, mobile_account, document_type, document_number, issue_date, expiry_date, file_upload, remarks, status } = req.body;

    const result = await db.query(
      `UPDATE tbl_tele_document 
       SET custom_field_id = COALESCE($1, custom_field_id),
           field_data = COALESCE($2, field_data),
           clientid = COALESCE($3, clientid),
           country_id = COALESCE($4, country_id),
           moduleid = COALESCE($5, moduleid),
           user_id = COALESCE($6, user_id),
           company_id = COALESCE($7, company_id),
           company = COALESCE($8, company),
           mobile_account = COALESCE($9, mobile_account),
           document_type = COALESCE($10, document_type),
           document_number = COALESCE($11, document_number),
           issue_date = COALESCE($12, issue_date),
           expiry_date = COALESCE($13, expiry_date),
           file_upload = COALESCE($14, file_upload),
           remarks = COALESCE($15, remarks),
           status = COALESCE($16, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $17 AND is_deleted = 0 
       RETURNING *`,
      [
        custom_field_id || null,
        field_data ? JSON.stringify(field_data) : null,
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : null,
        moduleid || null,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        company || null,
        mobile_account || null,
        document_type || null,
        document_number || null,
        issue_date || null,
        expiry_date || null,
        file_upload || null,
        remarks || null,
        status || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Document record not found or deleted' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating Telecom Document:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteTeleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE tbl_tele_document 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Document record not found' });
    }

    res.status(200).json({ message: 'Telecom Document record deleted successfully' });
  } catch (err) {
    console.error('Error deleting Telecom Document:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
