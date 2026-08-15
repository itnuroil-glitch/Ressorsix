const db = require('../config/db');

// Ensure tbl_toll_gate table exists and seed defaults if empty
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_toll_gate (
        id SERIAL PRIMARY KEY,
        gate_name VARCHAR(255) NOT NULL,
        toll_name VARCHAR(150),
        account_no VARCHAR(100),
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if table is empty, seed default UAE toll gates
    const checkRes = await db.query(`SELECT COUNT(*) FROM tbl_toll_gate WHERE is_deleted = 0`);
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const defaultGates = [
        { gate_name: 'Al Mamzar', toll_name: 'Salik', location: 'Dubai' },
        { gate_name: 'Al Safa', toll_name: 'Salik', location: 'Dubai' },
        { gate_name: 'Al Barsha', toll_name: 'Salik', location: 'Dubai' },
        { gate_name: 'Al Garhoud Bridge', toll_name: 'Salik', location: 'Dubai' },
        { gate_name: 'Al Maktoum Bridge', toll_name: 'Salik', location: 'Dubai' },
        { gate_name: 'Jebel Ali', toll_name: 'Salik', location: 'Dubai' },
        { gate_name: 'Sheikh Zayed Bridge', toll_name: 'Darb', location: 'Abu Dhabi' },
        { gate_name: 'Maqta Bridge', toll_name: 'Darb', location: 'Abu Dhabi' },
        { gate_name: 'Mussafah Bridge', toll_name: 'Darb', location: 'Abu Dhabi' },
        { gate_name: 'Sheikh Khalifa Bridge', toll_name: 'Darb', location: 'Abu Dhabi' }
      ];
      for (const gate of defaultGates) {
        await db.query(
          `INSERT INTO tbl_toll_gate (gate_name, toll_name, location, status, is_deleted) VALUES ($1, $2, $3, $4, 0)`,
          [gate.gate_name, gate.toll_name, gate.location, 'Active']
        );
      }
      console.log('Seeded default toll gates into tbl_toll_gate');
    }
  } catch (err) {
    console.error('Error initializing tbl_toll_gate:', err);
  }
};

initTable();

exports.getAllTollGates = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_toll_gate 
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
    console.error('Error fetching toll gates:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getTollGateById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_toll_gate WHERE id = $1 AND is_deleted = 0', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll gate not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching toll gate by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTollGate = async (req, res) => {
  try {
    const { gate_name, toll_name, account_no, location, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;

    if (!gate_name || !gate_name.trim()) {
      return res.status(400).json({ message: 'Gate name is required.' });
    }

    const gateList = gate_name
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (gateList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid gate name(s).' });
    }

    const insertedGates = [];
    const skippedGates = [];

    for (const item of gateList) {
      let checkQuery = `SELECT * FROM tbl_toll_gate WHERE LOWER(gate_name) = LOWER($1) AND is_deleted = 0`;
      let checkParams = [item];
      if (clientId) {
        checkQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        checkParams.push(clientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        skippedGates.push(item);
        continue;
      }

      const queryText = `
        INSERT INTO tbl_toll_gate (gate_name, toll_name, account_no, location, status, client_id, is_deleted)
        VALUES ($1, $2, $3, $4, $5, $6, 0)
        RETURNING *
      `;
      const result = await db.query(queryText, [
        item,
        toll_name ? toll_name.trim() : null,
        account_no ? account_no.trim() : null,
        location ? location.trim() : null,
        status || 'Active',
        clientId || null
      ]);
      insertedGates.push(result.rows[0]);
    }

    if (insertedGates.length === 0 && skippedGates.length > 0) {
      return res.status(409).json({
        message: `Gate name(s) already exist: ${skippedGates.join(', ')}`
      });
    }

    const message = insertedGates.length === 1
      ? 'Toll gate created successfully.'
      : `${insertedGates.length} Toll gates created successfully.${skippedGates.length > 0 ? ` (${skippedGates.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      tollGate: insertedGates[0],
      insertedGates,
      skippedGates
    });
  } catch (error) {
    console.error('Error creating toll gate:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTollGate = async (req, res) => {
  try {
    const { id } = req.params;
    const { gate_name, toll_name, account_no, location, status } = req.body;

    let trimmedName = gate_name ? gate_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_toll_gate WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_toll_gate WHERE LOWER(gate_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A toll gate with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_toll_gate
      SET gate_name = COALESCE($1, gate_name),
          toll_name = COALESCE($2, toll_name),
          account_no = COALESCE($3, account_no),
          location = COALESCE($4, location),
          status = COALESCE($5, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND is_deleted = 0
      RETURNING *
    `;
    const result = await db.query(queryText, [
      trimmedName,
      toll_name !== undefined ? (toll_name ? toll_name.trim() : null) : null,
      account_no !== undefined ? (account_no ? account_no.trim() : null) : null,
      location !== undefined ? (location ? location.trim() : null) : null,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll gate not found or deleted.' });
    }

    res.status(200).json({
      message: 'Toll gate updated successfully.',
      tollGate: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating toll gate:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTollGate = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_toll_gate
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll gate not found.' });
    }

    res.status(200).json({ message: 'Toll gate deleted successfully.' });
  } catch (error) {
    console.error('Error deleting toll gate:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
