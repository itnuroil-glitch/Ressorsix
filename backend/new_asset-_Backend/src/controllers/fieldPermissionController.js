const db = require('../config/db');

exports.getAllFieldPermissions = async (req, res) => {
  try {
    const query = `
      SELECT fp.*, c.client_name, m.module_name, co.name as country_name
      FROM tbl_feild_permision fp
      LEFT JOIN client c ON fp.clientid = c.id
      LEFT JOIN module m ON fp.moduleid = m.id
      LEFT JOIN country co ON fp.country_id = co.id
      ORDER BY fp.id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching field permissions:', error);
    res.status(500).json({ message: 'Error fetching field permissions' });
  }
};

exports.getFieldPermission = async (req, res) => {
  try {
    const { clientid, moduleid, countryid } = req.query;
    
    if (clientid && moduleid && countryid) {
        const query = `
          SELECT * FROM tbl_feild_permision 
          WHERE clientid = $1 AND moduleid = $2 AND country_id = $3
        `;
        const result = await db.query(query, [clientid, moduleid, countryid]);
        return res.status(200).json(result.rows[0] || null);
    }
    
    const { id } = req.params;
    if (id) {
        const query = `SELECT * FROM tbl_feild_permision WHERE id = $1`;
        const result = await db.query(query, [id]);
        return res.status(200).json(result.rows[0] || null);
    }

    res.status(400).json({ message: 'Missing parameters' });
  } catch (error) {
    console.error('Error fetching field permission:', error);
    res.status(500).json({ message: 'Error fetching field permission' });
  }
};

exports.createOrUpdateFieldPermission = async (req, res) => {
  try {
    const { clientid, moduleid, countryid, permitted_fields } = req.body;
    
    // Check if it exists
    const checkQuery = `SELECT id FROM tbl_feild_permision WHERE clientid = $1 AND moduleid = $2 AND country_id = $3`;
    const checkResult = await db.query(checkQuery, [clientid, moduleid, countryid]);
    
    if (checkResult.rows.length > 0) {
        // Update
        const id = checkResult.rows[0].id;
        const updateQuery = `
            UPDATE tbl_feild_permision 
            SET permitted_fields = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 RETURNING *
        `;
        const result = await db.query(updateQuery, [permitted_fields ? JSON.stringify(permitted_fields) : '{}', id]);
        return res.status(200).json(result.rows[0]);
    } else {
        // Insert
        const insertQuery = `
            INSERT INTO tbl_feild_permision (clientid, moduleid, country_id, permitted_fields)
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const result = await db.query(insertQuery, [clientid, moduleid, countryid, permitted_fields ? JSON.stringify(permitted_fields) : '{}']);
        return res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error saving field permission:', error);
    res.status(500).json({ message: 'Error saving field permission' });
  }
};

exports.deleteFieldPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM tbl_feild_permision WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error deleting field permission:', error);
    res.status(500).json({ message: 'Error deleting field permission' });
  }
};
