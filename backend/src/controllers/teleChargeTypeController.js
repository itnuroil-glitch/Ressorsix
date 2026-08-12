const db = require('../config/db');

// Ensure table exists
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_charge_type (
        id SERIAL PRIMARY KEY,
        charge_type_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if table is empty, seed default charge types
    const checkRes = await db.query(`SELECT COUNT(*) FROM tbl_tele_charge_type WHERE is_deleted = 0`);
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const defaultTypes = [
        'Local Call',
        'International Call',
        'Roaming Call',
        'Local Data',
        'Roaming Data',
        'SMS',
        'Premium SMS',
        'Special Number',
        'Third Party Service',
        'Late Payment Fee'
      ];
      for (const name of defaultTypes) {
        await db.query(
          `INSERT INTO tbl_tele_charge_type (charge_type_name, status, is_deleted) VALUES ($1, $2, 0)`,
          [name, 'Active']
        );
      }
      console.log('Seeded default tele charge types into tbl_tele_charge_type');
    }
  } catch (err) {
    console.error('Error initializing tbl_tele_charge_type:', err);
  }
};
initTable();

exports.getAllTeleChargeTypes = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_tele_charge_type 
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
    console.error('Error fetching tele charge types:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getTeleChargeTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_tele_charge_type WHERE id = $1 AND is_deleted = 0', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele charge type not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tele charge type by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTeleChargeType = async (req, res) => {
  try {
    const { charge_type_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!charge_type_name || !charge_type_name.trim()) {
      return res.status(400).json({ message: 'Charge type name is required.' });
    }

    const typeList = charge_type_name
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (typeList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid charge type name(s).' });
    }

    const insertedTypes = [];
    const skippedTypes = [];

    for (const item of typeList) {
      let checkQuery = `SELECT * FROM tbl_tele_charge_type WHERE LOWER(charge_type_name) = LOWER($1) AND is_deleted = 0`;
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
        INSERT INTO tbl_tele_charge_type (charge_type_name, status, client_id, is_deleted)
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
        message: `Charge type name(s) already exist: ${skippedTypes.join(', ')}`
      });
    }

    const message = insertedTypes.length === 1
      ? 'Tele charge type created successfully.'
      : `${insertedTypes.length} Tele charge types created successfully.${skippedTypes.length > 0 ? ` (${skippedTypes.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      chargeType: insertedTypes[0],
      insertedTypes,
      skippedTypes
    });
  } catch (error) {
    console.error('Error creating tele charge type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTeleChargeType = async (req, res) => {
  try {
    const { id } = req.params;
    const { charge_type_name, status } = req.body;

    let trimmedName = charge_type_name ? charge_type_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_tele_charge_type WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_tele_charge_type WHERE LOWER(charge_type_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A tele charge type with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_tele_charge_type
      SET charge_type_name = COALESCE($1, charge_type_name),
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
      return res.status(404).json({ message: 'Tele charge type not found or deleted.' });
    }

    res.status(200).json({
      message: 'Tele charge type updated successfully.',
      chargeType: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tele charge type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTeleChargeType = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_tele_charge_type
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele charge type not found.' });
    }

    res.status(200).json({ message: 'Tele charge type deleted successfully.' });
  } catch (error) {
    console.error('Error deleting tele charge type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
