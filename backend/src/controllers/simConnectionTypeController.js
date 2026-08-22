const db = require('../config/db');

exports.getAllSimConnectionTypes = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_sim_connection_type 
      WHERE is_deleted = 0 
    `;
    let params = [];
    if (clientId) {
      queryText += ` AND (client_id = $1 OR client_id IS NULL)`;
      params.push(clientId);
    }
    queryText += ` ORDER BY id ASC`;
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching SIM connection types:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createSimConnectionType = async (req, res) => {
  try {
    const { connection_type_name, name, status } = req.body;
    const typeName = connection_type_name || name;
    const clientId = req.body.client_id || req.body.clientid;

    if (!typeName || !typeName.trim()) {
      return res.status(400).json({ message: 'Connection type name is required.' });
    }

    const typeList = typeName
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (typeList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid connection type name(s).' });
    }

    const insertedTypes = [];
    const skippedTypes = [];

    for (const item of typeList) {
      let checkQuery = `SELECT * FROM tbl_sim_connection_type WHERE LOWER(connection_type_name) = LOWER($1) AND is_deleted = 0`;
      let checkParams = [item];
      if (clientId) {
        checkQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        checkParams.push(clientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        skippedTypes.push(item);
        continue;
      }

      const queryText = `
        INSERT INTO tbl_sim_connection_type (connection_type_name, status, client_id, is_deleted)
        VALUES ($1, $2, $3, 0)
        RETURNING *
      `;
      const result = await db.query(queryText, [
        item,
        status || 'Active',
        clientId || null
      ]);
      insertedTypes.push(result.rows[0]);
    }

    if (insertedTypes.length === 0 && skippedTypes.length > 0) {
      return res.status(409).json({
        message: `Connection type name(s) already exist: ${skippedTypes.join(', ')}`
      });
    }

    const message = insertedTypes.length === 1
      ? 'SIM connection type created successfully.'
      : `${insertedTypes.length} SIM connection types created successfully.`;

    res.status(201).json({
      message,
      connectionType: insertedTypes[0],
      insertedTypes,
      skippedTypes
    });
  } catch (error) {
    console.error('Error creating SIM connection type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateSimConnectionType = async (req, res) => {
  try {
    const { id } = req.params;
    const { connection_type_name, name, status } = req.body;
    const typeName = connection_type_name || name;

    let trimmedName = typeName ? typeName.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_sim_connection_type WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_sim_connection_type WHERE LOWER(connection_type_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A SIM connection type with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_sim_connection_type
      SET connection_type_name = COALESCE($1, connection_type_name),
          status = COALESCE($2, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND is_deleted = 0
      RETURNING *
    `;
    const result = await db.query(queryText, [
      trimmedName,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM connection type not found or deleted.' });
    }

    res.status(200).json({
      message: 'SIM connection type updated successfully.',
      connectionType: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating SIM connection type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteSimConnectionType = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_sim_connection_type
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM connection type not found.' });
    }

    res.status(200).json({ message: 'SIM connection type deleted successfully.' });
  } catch (error) {
    console.error('Error deleting SIM connection type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
