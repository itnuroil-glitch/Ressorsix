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
      const compIds = String(company_id).split(',').map(s => s.trim()).filter(Boolean);
      if (compIds.length > 0) {
        const placeholders = compIds.map(id => {
          params.push(id);
          return `$${params.length}`;
        }).join(', ');
        query += ` AND (
          s.company_id::text IN (${placeholders})
          OR EXISTS (
            SELECT 1 FROM unnest(string_to_array(s.company_id::text, ',')) AS cid
            WHERE TRIM(cid) IN (${placeholders})
          )
        )`;
      }
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

exports.getSuppliersByClientAndCompany = async (req, res) => {
  try {
    const clientid = req.query.clientid || req.query.clientId || req.params.clientid;
    const targetCompId = req.query.company_id || req.query.companyId;

    let queryText = `
      SELECT 
        s.id,
        s.id::text AS value,
        s.clientid,
        c.client_name,
        s.company_id,
        COALESCE(
          comp.company_name,
          (
            SELECT string_agg(comp_sub.company_name, ', ')
            FROM company comp_sub
            WHERE comp_sub.id::text = ANY(string_to_array(s.company_id::text, ','))
          )
        ) AS company_name,
        COALESCE(
          s.field_data->>'supplier_name',
          s.field_data->>'1781941788052',
          s.field_data->>'name',
          (
            SELECT x.value 
            FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) x
            LEFT JOIN tbl_customfield_details cfd ON cfd.field_id::text = x.key::text
            WHERE (LOWER(cfd.field_name) LIKE '%supplier%' OR LOWER(x.key) LIKE '%supplier%')
              AND (cfd.field_name IS NULL OR LOWER(cfd.field_name) NOT LIKE '%type%')
            LIMIT 1
          ),
          (
            SELECT x.value 
            FROM jsonb_each_text(COALESCE(s.field_data, '{}'::jsonb)) x
            WHERE LENGTH(x.value) > 1 AND x.value NOT LIKE '%{%' AND x.value NOT LIKE '%[%'
            LIMIT 1
          )
        ) AS supplier_name
      FROM tbl_suppliers s
      LEFT JOIN client c ON s.clientid::text = c.id::text
      LEFT JOIN company comp ON s.company_id::text = comp.id::text
      WHERE (s.isdelete = false OR s.isdelete IS NULL)
    `;
    const params = [];

    if (clientid && clientid !== 'all' && clientid !== 'undefined') {
      params.push(String(clientid).trim());
      queryText += ` AND (
        s.clientid::text = $${params.length}
        OR EXISTS (
          SELECT 1 FROM company c_match
          WHERE c_match.id::text = ANY(string_to_array(s.company_id::text, ','))
            AND c_match.clientid::text = $${params.length}
        )
      )`;
    }

    if (targetCompId && targetCompId !== 'All' && targetCompId !== 'undefined') {
      const compIds = String(targetCompId).split(',').map(s => s.trim()).filter(Boolean);
      if (compIds.length > 0) {
        const placeholders = compIds.map(id => {
          params.push(id);
          return `$${params.length}`;
        }).join(', ');
        queryText += ` AND (
          s.company_id::text IN (${placeholders})
          OR EXISTS (
            SELECT 1 FROM unnest(string_to_array(s.company_id::text, ',')) AS cid
            WHERE TRIM(cid) IN (${placeholders})
          )
        )`;
      }
    }

    queryText += ` ORDER BY s.id DESC`;

    const result = await db.query(queryText, params);

    const formatted = result.rows.map(row => {
      const name = row.supplier_name || `Supplier #${row.id}`;
      return {
        id: row.id,
        name: name,
        label: row.company_name ? `${name} (${row.company_name})` : name,
        value: name,
        supplier_name: name,
        clientid: row.clientid,
        client_name: row.client_name,
        company_id: row.company_id,
        company_name: row.company_name
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error in getSuppliersByClientAndCompany:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
};

exports.getSuppliersByClient = async (req, res) => {
  return exports.getSuppliersByClientAndCompany(req, res);
};


