const db = require('../config/db');

// Ensure tbl_company_legal_form table exists
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_company_legal_form (
        id SERIAL PRIMARY KEY,
        legal_form_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if table is empty, seed default UAE enterprise legal forms
    const checkRes = await db.query(`SELECT COUNT(*) FROM tbl_company_legal_form WHERE is_deleted = 0`);
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const defaultForms = [
        'Limited Liability Company (LLC)',
        'Sole Establishment',
        'Free Zone Establishment (FZE)',
        'Free Zone Company (FZ-LLC)',
        'Branch of a Foreign Company',
        'Public Joint Stock Company (PJSC)',
        'Private Joint Stock Company (PrJSC)',
        'General Partnership'
      ];
      for (const name of defaultForms) {
        await db.query(
          `INSERT INTO tbl_company_legal_form (legal_form_name, status, is_deleted) VALUES ($1, $2, 0)`,
          [name, 'Active']
        );
      }
      console.log('Seeded default company legal forms into tbl_company_legal_form');
    }
  } catch (err) {
    console.error('Error initializing tbl_company_legal_form:', err);
  }
};

initTable();

exports.getAllCompanyLegalForms = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_company_legal_form 
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
    console.error('Error fetching company legal forms:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getCompanyLegalFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_company_legal_form WHERE id = $1 AND is_deleted = 0', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company legal form not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company legal form by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createCompanyLegalForm = async (req, res) => {
  try {
    const { legal_form_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!legal_form_name || !legal_form_name.trim()) {
      return res.status(400).json({ message: 'Legal form name is required.' });
    }

    const formList = legal_form_name
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (formList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid legal form name(s).' });
    }

    const insertedForms = [];
    const skippedForms = [];

    for (const item of formList) {
      let checkQuery = `SELECT * FROM tbl_company_legal_form WHERE LOWER(legal_form_name) = LOWER($1) AND is_deleted = 0`;
      let checkParams = [item];
      if (clientId) {
        checkQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        checkParams.push(clientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        skippedForms.push(item);
        continue;
      }

      const queryText = `
        INSERT INTO tbl_company_legal_form (legal_form_name, status, client_id, is_deleted)
        VALUES ($1, $2, $3, 0)
        RETURNING *
      `;
      const result = await db.query(queryText, [
        item,
        status || 'Active',
        clientId || null
      ]);
      insertedForms.push(result.rows[0]);
    }

    if (insertedForms.length === 0 && skippedForms.length > 0) {
      return res.status(409).json({
        message: `Legal form name(s) already exist: ${skippedForms.join(', ')}`
      });
    }

    const message = insertedForms.length === 1
      ? 'Company legal form created successfully.'
      : `${insertedForms.length} Company legal forms created successfully.${skippedForms.length > 0 ? ` (${skippedForms.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      legalForm: insertedForms[0],
      insertedForms,
      skippedForms
    });
  } catch (error) {
    console.error('Error creating company legal form:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateCompanyLegalForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { legal_form_name, status } = req.body;

    let trimmedName = legal_form_name ? legal_form_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_company_legal_form WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_company_legal_form WHERE LOWER(legal_form_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A legal form with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_company_legal_form
      SET legal_form_name = COALESCE($1, legal_form_name),
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
      return res.status(404).json({ message: 'Company legal form not found or deleted.' });
    }

    res.status(200).json({
      message: 'Company legal form updated successfully.',
      legalForm: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating company legal form:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteCompanyLegalForm = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_company_legal_form
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company legal form not found.' });
    }

    res.status(200).json({ message: 'Company legal form deleted successfully.' });
  } catch (error) {
    console.error('Error deleting company legal form:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
