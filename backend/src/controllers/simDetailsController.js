const db = require('../config/db');

exports.getAllSimDetails = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        sd.*, 
        sd.tele_id AS id,
        c.client_name,
        co.name as country_name,
        (
          SELECT string_agg(company_name, ', ') 
          FROM company 
          WHERE id = ANY(string_to_array(nullif(sd.company_id, ''), ',')::integer[])
        ) AS company_name
      FROM tbl_sim_details sd
      LEFT JOIN client c ON sd.clientid::integer = c.id
      LEFT JOIN country co ON sd.country_id = co.id
      WHERE sd.is_deleted = 0
    `;
    let params = [];
    if (clientid) {
      query += ' AND sd.clientid::text = $1';
      params.push(String(clientid));
    }
    query += ' ORDER BY sd.tele_id DESC';
    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching SIM details:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getSimDetailById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT sd.*, sd.tele_id AS id, c.client_name, co.name as country_name
      FROM tbl_sim_details sd
      LEFT JOIN client c ON sd.clientid::integer = c.id
      LEFT JOIN country co ON sd.country_id = co.id
      WHERE sd.tele_id = $1 AND sd.is_deleted = 0
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM detail record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching SIM detail by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createSimDetail = async (req, res) => {
  try {
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status } = req.body;

    const result = await db.query(
      `INSERT INTO tbl_sim_details 
        (custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status, is_deleted, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *, tele_id AS id`,
      [
        custom_field_id || null,
        field_data ? JSON.stringify(field_data) : '{}',
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : null,
        moduleid || 52,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        status || 'Active'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating SIM detail:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateSimDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status } = req.body;

    const result = await db.query(
      `UPDATE tbl_sim_details 
       SET custom_field_id = COALESCE($1, custom_field_id),
           field_data = COALESCE($2, field_data),
           clientid = COALESCE($3, clientid),
           country_id = COALESCE($4, country_id),
           moduleid = COALESCE($5, moduleid),
           user_id = COALESCE($6, user_id),
           company_id = COALESCE($7, company_id),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE tele_id = $9 AND is_deleted = 0 
       RETURNING *, tele_id AS id`,
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
      return res.status(404).json({ message: 'SIM detail record not found or deleted' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating SIM detail:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteSimDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE tbl_sim_details 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE tele_id = $1 RETURNING *, tele_id AS id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM detail record not found' });
    }

    res.status(200).json({ message: 'SIM detail record deleted successfully' });
  } catch (err) {
    console.error('Error deleting SIM detail:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
