const db = require('../config/db');

exports.getAllSuppliers = async (req, res) => {
  try {
    const { clientid } = req.query;
    const company_id = req.query.company_id || req.query.companyid;

    let query = `
      SELECT 
        s.*, 
        c.company_name,
        cl.client_name,
        COALESCE(
          s.field_data->>'supplier_name',
          s.field_data->>'1781941788052',
          (
            SELECT x.value 
            FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) x
            LEFT JOIN tbl_customfield_details cfd ON cfd.field_id::text = x.key::text
            WHERE (LOWER(cfd.field_name) LIKE '%supplier%' OR LOWER(x.key) LIKE '%supplier%')
              AND (cfd.field_name IS NULL OR LOWER(cfd.field_name) NOT LIKE '%type%')
            LIMIT 1
          ),
          (SELECT value FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) LIMIT 1)
        ) AS supplier_name
      FROM tbl_suppliers s
      LEFT JOIN company c ON s.company_id::text = c.id::text
      LEFT JOIN client cl ON s.clientid::text = cl.id::text
      WHERE (s.isdelete = false OR s.isdelete IS NULL)
    `;
    let params = [];
    if (clientid && clientid !== 'all' && clientid !== 'undefined') {
      params.push(clientid);
      query += ` AND s.clientid::text = $${params.length}`;
    }
    if (company_id && company_id !== 'all' && company_id !== 'undefined') {
      params.push(company_id);
      query += ` AND (
        s.company_id IS NULL 
        OR s.company_id = '' 
        OR s.company_id::text = $${params.length} 
        OR string_to_array(nullif(s.company_id::text, ''), ',') && string_to_array(nullif($${params.length}::text, ''), ',')
      )`;
    }
    query += ' ORDER BY s.id DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    const result = await db.query(
      `INSERT INTO tbl_suppliers (custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    const result = await db.query(
      `UPDATE tbl_suppliers 
       SET custom_field_id = $1, field_data = $2, clientid = $3, country_id = $4, moduleid = $5, roleid = $6, user_id = $7, company_id = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM tbl_suppliers WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSuppliersJoinedInfo = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id AS supplier_id,
        s.id,
        s.clientid,
        c.client_name,
        s.company_id,
        comp.company_name,
        COALESCE(
          s.field_data->>'supplier_name',
          s.field_data->>'1781941788052',
          (
            SELECT x.value 
            FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) x
            LEFT JOIN tbl_customfield_details cfd ON cfd.field_id::text = x.key::text
            WHERE (LOWER(cfd.field_name) LIKE '%supplier%' OR LOWER(x.key) LIKE '%supplier%')
              AND (cfd.field_name IS NULL OR LOWER(cfd.field_name) NOT LIKE '%type%')
            LIMIT 1
          ),
          (SELECT value FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) LIMIT 1)
        ) AS supplier_name,
        s.status,
        s.created_at,
        s.field_data
      FROM tbl_suppliers s
      LEFT JOIN client c ON s.clientid::text = c.id::text
      LEFT JOIN company comp ON s.company_id::text = comp.id::text
      WHERE s.isdelete = false OR s.isdelete IS NULL
      ORDER BY s.id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSuppliersByClient = async (req, res) => {
  try {
    let clientid = req.params.clientid || req.query.clientid;
    const company_id = req.query.company_id || req.query.companyid;

    if (clientid && (clientid.startsWith(':') || clientid === 'undefined' || clientid === 'all')) {
      clientid = req.query.clientid || null;
    }

    let query = `
      SELECT 
        s.id AS supplier_id,
        s.id,
        s.clientid,
        c.client_name,
        s.company_id,
        comp.company_name,
        COALESCE(
          s.field_data->>'supplier_name',
          s.field_data->>'1781941788052',
          (
            SELECT x.value 
            FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) x
            LEFT JOIN tbl_customfield_details cfd ON cfd.field_id::text = x.key::text
            WHERE (LOWER(cfd.field_name) LIKE '%supplier%' OR LOWER(x.key) LIKE '%supplier%')
              AND (cfd.field_name IS NULL OR LOWER(cfd.field_name) NOT LIKE '%type%')
            LIMIT 1
          ),
          (SELECT value FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) LIMIT 1)
        ) AS supplier_name,
        s.status,
        s.created_at,
        s.field_data
      FROM tbl_suppliers s
      LEFT JOIN client c ON s.clientid::text = c.id::text
      LEFT JOIN company comp ON s.company_id::text = comp.id::text
      WHERE (s.isdelete = false OR s.isdelete IS NULL)
    `;

    const params = [];
    if (clientid && clientid !== 'all' && clientid !== 'undefined') {
      params.push(clientid);
      query += ` AND s.clientid::text = $${params.length}`;
    }
    if (company_id && company_id !== 'all' && company_id !== 'undefined') {
      params.push(company_id);
      query += ` AND (
        s.company_id IS NULL 
        OR s.company_id = '' 
        OR s.company_id::text = $${params.length} 
        OR string_to_array(nullif(s.company_id::text, ''), ',') && string_to_array(nullif($${params.length}::text, ''), ',')
      )`;
    }

    query += ' ORDER BY c.client_name ASC NULLS LAST, s.id DESC';
    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

