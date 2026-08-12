const db = require('../config/db');

// Ensure table exists
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_doc_type (
        id SERIAL PRIMARY KEY,
        doc_type_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tbl_tele_documet_type (
        id SERIAL PRIMARY KEY,
        doc_type_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if table is empty, seed default document types
    const checkRes = await db.query(`SELECT COUNT(*) FROM tbl_tele_doc_type WHERE is_deleted = 0`);
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const defaultTypes = [
        'Telecom Invoice',
        'SIM Contract',
        'Device Warranty',
        'SIM Handover',
        'Employee Acknowledgement',
        'Provider Agreement'
      ];
      for (const name of defaultTypes) {
        await db.query(
          `INSERT INTO tbl_tele_doc_type (doc_type_name, status, is_deleted) VALUES ($1, $2, 0)`,
          [name, 'Active']
        );
      }
      console.log('Seeded default tele document types into tbl_tele_doc_type');
    }

    // Seed role permissions for telecom document types (Module 62) and related telecom modules
    const rolesRes = await db.query(`SELECT id FROM role WHERE is_deleted = false`);
    const targetModules = [58, 59, 61, 62];
    for (const r of rolesRes.rows) {
      for (const mId of targetModules) {
        const checkPerm = await db.query(
          `SELECT id FROM role_permission WHERE role_id = $1 AND module_id = $2`,
          [r.id, mId]
        );
        if (checkPerm.rows.length === 0) {
          await db.query(
            `INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control) VALUES ($1, $2, true, true, true, true, true)`,
            [r.id, mId]
          );
        }
      }
    }
  } catch (err) {
    console.error('Error initializing tbl_tele_doc_type:', err);
  }
};
initTable();

exports.getAllTeleDocTypes = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_tele_doc_type 
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
    console.error('Error fetching tele document types:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getTeleDocTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_tele_doc_type WHERE id = $1 AND is_deleted = 0', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele document type not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tele document type by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTeleDocType = async (req, res) => {
  try {
    const { doc_type_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!doc_type_name || !doc_type_name.trim()) {
      return res.status(400).json({ message: 'Document type name is required.' });
    }

    const typeList = doc_type_name
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (typeList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid document type name(s).' });
    }

    const insertedTypes = [];
    const skippedTypes = [];

    for (const item of typeList) {
      let checkQuery = `SELECT * FROM tbl_tele_doc_type WHERE LOWER(doc_type_name) = LOWER($1) AND is_deleted = 0`;
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
        INSERT INTO tbl_tele_doc_type (doc_type_name, status, client_id, is_deleted)
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
        message: `Document type name(s) already exist: ${skippedTypes.join(', ')}`
      });
    }

    const message = insertedTypes.length === 1
      ? 'Tele document type created successfully.'
      : `${insertedTypes.length} Tele document types created successfully.${skippedTypes.length > 0 ? ` (${skippedTypes.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      docType: insertedTypes[0],
      insertedTypes,
      skippedTypes
    });
  } catch (error) {
    console.error('Error creating tele document type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTeleDocType = async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_type_name, status } = req.body;

    let trimmedName = doc_type_name ? doc_type_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_tele_doc_type WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_tele_doc_type WHERE LOWER(doc_type_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A tele document type with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_tele_doc_type
      SET doc_type_name = COALESCE($1, doc_type_name),
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
      return res.status(404).json({ message: 'Tele document type not found or deleted.' });
    }

    res.status(200).json({
      message: 'Tele document type updated successfully.',
      docType: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tele document type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTeleDocType = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_tele_doc_type
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele document type not found.' });
    }

    res.status(200).json({ message: 'Tele document type deleted successfully.' });
  } catch (error) {
    console.error('Error deleting tele document type:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
