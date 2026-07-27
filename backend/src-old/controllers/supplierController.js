const db = require('../config/db');

exports.getAllSuppliers = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = 'SELECT * FROM tbl_suppliers';
    let params = [];
    if (clientid) {
      query += ' WHERE clientid = $1';
      params.push(clientid);
    }
    query += ' ORDER BY id DESC';
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
        s.clientid,
        c.client_name,
        s.field_data->>'1781941788052' AS supplier_name,
        s.status,
        s.created_at
      FROM tbl_suppliers s
      LEFT JOIN client c ON s.clientid = c.id
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
    const { clientid } = req.params;
    const query = `
      SELECT 
        id,
        field_data->>'1781941788052' AS supplier_name
      FROM tbl_suppliers
      WHERE clientid = $1 
        AND (isdelete = false OR isdelete IS NULL)
      ORDER BY id DESC
    `;
    const result = await db.query(query, [clientid]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

