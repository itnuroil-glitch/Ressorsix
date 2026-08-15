const pool = require('../config/db');

// Get system settings (returns distinct setting keys for the client)
exports.getAllSettings = async (req, res) => {
  try {
    const { client_id } = req.query;
    let query;
    const params = [];

    if (client_id) {
      query = `
        SELECT DISTINCT ON (setting_key) id, clientid, setting_key, setting_value, setting_type, description, created_at, updated_at
        FROM tbl_system_setting
        WHERE clientid = $1 OR clientid IS NULL
        ORDER BY setting_key ASC, clientid DESC NULLS LAST
      `;
      params.push(parseInt(client_id, 10));
    } else {
      query = `
        SELECT DISTINCT ON (setting_key) id, clientid, setting_key, setting_value, setting_type, description, created_at, updated_at
        FROM tbl_system_setting
        WHERE clientid IS NULL
        ORDER BY setting_key ASC, id ASC
      `;
    }

    const { rows } = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Server error while fetching system settings' });
  }
};

// Get single setting by key
exports.getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { client_id } = req.query;
    let query = 'SELECT * FROM tbl_system_setting WHERE setting_key = $1';
    const params = [key];

    if (client_id) {
      query += ' AND (clientid = $2 OR clientid IS NULL) ORDER BY clientid DESC NULLS LAST LIMIT 1';
      params.push(parseInt(client_id, 10));
    } else {
      query += ' AND clientid IS NULL LIMIT 1';
    }

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching setting by key:', error);
    res.status(500).json({ message: 'Server error while fetching setting' });
  }
};

// Create or Upsert a system setting
exports.createSetting = async (req, res) => {
  try {
    const { setting_key, setting_value, setting_type, description, client_id } = req.body;
    if (!setting_key) {
      return res.status(400).json({ message: 'Setting key is required.' });
    }

    const parsedClientId = client_id ? parseInt(client_id, 10) : null;

    // Check if client-specific record exists
    const checkQuery = `
      SELECT id FROM tbl_system_setting 
      WHERE setting_key = $1 AND (clientid = $2 OR ($2 IS NULL AND clientid IS NULL))
    `;
    const checkRes = await pool.query(checkQuery, [setting_key.trim(), parsedClientId]);

    let rows;
    if (checkRes.rows.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE tbl_system_setting SET
          setting_value = $1,
          setting_type = $2,
          description = $3,
          updated_at = NOW()
        WHERE id = $4 RETURNING *;
      `;
      const updateRes = await pool.query(updateQuery, [
        setting_value || '0',
        setting_type || 'Boolean',
        description || '',
        checkRes.rows[0].id,
      ]);
      rows = updateRes.rows;
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO tbl_system_setting (clientid, setting_key, setting_value, setting_type, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *;
      `;
      const insertRes = await pool.query(insertQuery, [
        parsedClientId,
        setting_key.trim(),
        setting_value || '0',
        setting_type || 'Boolean',
        description || '',
      ]);
      rows = insertRes.rows;
    }

    res.status(201).json({ message: 'Setting saved successfully', setting: rows[0] });
  } catch (error) {
    console.error('Error saving system setting:', error);
    res.status(500).json({ message: 'Server error while saving system setting' });
  }
};

// Update an existing system setting
exports.updateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { setting_key, setting_value, setting_type, description, client_id } = req.body;

    const parsedClientId = client_id ? parseInt(client_id, 10) : null;

    // Check if updating a global default record while logged in as a client -> create/update client override row
    const existingRes = await pool.query('SELECT clientid, setting_key FROM tbl_system_setting WHERE id = $1', [id]);
    if (existingRes.rows.length > 0 && existingRes.rows[0].clientid === null && parsedClientId !== null) {
      const keyToUse = setting_key || existingRes.rows[0].setting_key;
      
      // Upsert for client
      const checkClient = await pool.query('SELECT id FROM tbl_system_setting WHERE setting_key = $1 AND clientid = $2', [keyToUse, parsedClientId]);
      let rows;
      if (checkClient.rows.length > 0) {
        const upRes = await pool.query(
          'UPDATE tbl_system_setting SET setting_value = $1, setting_type = $2, description = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
          [setting_value, setting_type || 'Boolean', description || '', checkClient.rows[0].id]
        );
        rows = upRes.rows;
      } else {
        const inRes = await pool.query(
          'INSERT INTO tbl_system_setting (clientid, setting_key, setting_value, setting_type, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
          [parsedClientId, keyToUse, setting_value, setting_type || 'Boolean', description || '']
        );
        rows = inRes.rows;
      }
      return res.status(200).json({ message: 'Client system setting updated successfully', setting: rows[0] });
    }

    const query = `
      UPDATE tbl_system_setting SET
        setting_key = $1,
        setting_value = $2,
        setting_type = $3,
        description = $4,
        updated_at = NOW()
      WHERE id = $5 RETURNING *;
    `;
    const values = [setting_key, setting_value, setting_type || 'Boolean', description || '', id];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.status(200).json({ message: 'Setting updated successfully', setting: rows[0] });
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ message: 'Server error while updating system setting' });
  }
};

// Delete a system setting
exports.deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tbl_system_setting WHERE id = $1', [id]);
    res.status(200).json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting system setting:', error);
    res.status(500).json({ message: 'Server error while deleting system setting' });
  }
};
