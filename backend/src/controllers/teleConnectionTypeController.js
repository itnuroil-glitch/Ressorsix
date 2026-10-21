const db = require('../config/db');

// Tele Connection Type master (SIM, Internet, Landline, ...)
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_connection_type (
        id SERIAL PRIMARY KEY,
        connection_type_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Seed the three built-in types the first time the table is created
    const count = await db.query('SELECT COUNT(*)::int AS n FROM tbl_tele_connection_type');
    if (count.rows[0].n === 0) {
      for (const name of ['SIM', 'Internet', 'Landline']) {
        await db.query(
          `INSERT INTO tbl_tele_connection_type (connection_type_name, status, client_id, is_deleted)
           VALUES ($1, 'Active', NULL, 0)`,
          [name]
        );
      }
    }
  } catch (err) {
    console.error('Error initializing tbl_tele_connection_type:', err);
  }
};
initTable();

exports.getAllTeleConnectionTypes = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `SELECT * FROM tbl_tele_connection_type WHERE is_deleted = 0`;
    const params = [];
    if (clientId) {
      params.push(String(clientId));
      queryText += ` AND (client_id = $1 OR client_id IS NULL)`;
    }
    queryText += ` ORDER BY id ASC`;
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching tele connection types:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTeleConnectionType = async (req, res) => {
  try {
    const { connection_type_name, status } = req.body || {};
    const clientId = (req.body && (req.body.client_id || req.body.clientid)) || null;
    if (!connection_type_name || !String(connection_type_name).trim()) {
      return res.status(400).json({ message: 'Connection type name is required.' });
    }

    // Allow several names separated by commas
    const names = String(connection_type_name)
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    if (names.length === 0) {
      return res.status(400).json({ message: 'Please enter valid connection type name(s).' });
    }

    const inserted = [];
    const skipped = [];
    for (const name of names) {
      let dupQuery = `SELECT id FROM tbl_tele_connection_type WHERE LOWER(connection_type_name) = LOWER($1) AND is_deleted = 0`;
      const dupParams = [name];
      if (clientId) {
        dupQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        dupParams.push(String(clientId));
      }
      const dup = await db.query(dupQuery, dupParams);
      if (dup.rows.length > 0) {
        skipped.push(name);
        continue;
      }
      const result = await db.query(
        `INSERT INTO tbl_tele_connection_type (connection_type_name, status, client_id, is_deleted)
         VALUES ($1, $2, $3, 0) RETURNING *`,
        [name, status || 'Active', clientId ? String(clientId) : null]
      );
      inserted.push(result.rows[0]);
    }

    if (inserted.length === 0 && skipped.length > 0) {
      return res.status(409).json({ message: `Connection type name(s) already exist: ${skipped.join(', ')}` });
    }
    const message =
      inserted.length === 1
        ? 'Tele connection type created successfully.'
        : `${inserted.length} tele connection types created successfully.${skipped.length > 0 ? ` (${skipped.length} skipped as duplicates)` : ''}`;
    res.status(201).json({ message, connectionType: inserted[0], inserted, skipped });
  } catch (error) {
    console.error('Error creating tele connection type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTeleConnectionType = async (req, res) => {
  try {
    const { id } = req.params;
    const { connection_type_name, status } = req.body || {};
    const name = connection_type_name ? String(connection_type_name).trim() : null;
    if (!name) {
      return res.status(400).json({ message: 'Connection type name is required.' });
    }

    const current = await db.query('SELECT client_id FROM tbl_tele_connection_type WHERE id = $1 AND is_deleted = 0', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ message: 'Tele connection type not found.' });
    }
    const currentClientId = current.rows[0].client_id;
    let dupQuery = `SELECT id FROM tbl_tele_connection_type WHERE LOWER(connection_type_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
    const dupParams = [name, id];
    if (currentClientId) {
      dupQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
      dupParams.push(currentClientId);
    }
    const dup = await db.query(dupQuery, dupParams);
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'A connection type with this name already exists.' });
    }

    const result = await db.query(
      `UPDATE tbl_tele_connection_type
       SET connection_type_name = $1, status = COALESCE($2, status), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND is_deleted = 0 RETURNING *`,
      [name, status || null, id]
    );
    res.status(200).json({ message: 'Tele connection type updated successfully.', connectionType: result.rows[0] });
  } catch (error) {
    console.error('Error updating tele connection type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTeleConnectionType = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE tbl_tele_connection_type SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = 0 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele connection type not found or already deleted.' });
    }
    res.status(200).json({ message: 'Tele connection type deleted successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting tele connection type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
