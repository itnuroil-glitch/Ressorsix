const db = require('../config/db');

// Ensure tbl_company_def_currency table exists
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_company_def_currency (
        id SERIAL PRIMARY KEY,
        currency_code VARCHAR(10) NOT NULL,
        currency_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if table is empty, seed default currencies
    const checkRes = await db.query(`SELECT COUNT(*) FROM tbl_company_def_currency WHERE is_deleted = 0`);
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const defaultCurrencies = [
        { code: 'AED', name: 'UAE Dirham (AED)' },
        { code: 'USD', name: 'US Dollar (USD)' },
        { code: 'EUR', name: 'Euro (EUR)' },
        { code: 'GBP', name: 'British Pound (GBP)' },
        { code: 'SAR', name: 'Saudi Riyal (SAR)' },
        { code: 'QAR', name: 'Qatari Riyal (QAR)' },
        { code: 'KWD', name: 'Kuwaiti Dinar (KWD)' },
        { code: 'BHD', name: 'Bahraini Dinar (BHD)' },
        { code: 'OMR', name: 'Omani Rial (OMR)' },
        { code: 'INR', name: 'Indian Rupee (INR)' }
      ];
      for (const curr of defaultCurrencies) {
        await db.query(
          `INSERT INTO tbl_company_def_currency (currency_code, currency_name, status, is_deleted) VALUES ($1, $2, $3, 0)`,
          [curr.code, curr.name, 'Active']
        );
      }
      console.log('Seeded default currencies into tbl_company_def_currency');
    }
  } catch (err) {
    console.error('Error initializing tbl_company_def_currency:', err);
  }
};

initTable();

exports.getAllCompanyDefCurrency = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_company_def_currency 
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
    console.error('Error fetching company default currencies:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getCompanyDefCurrencyById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_company_def_currency WHERE id = $1 AND is_deleted = 0', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company default currency not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company default currency by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createCompanyDefCurrency = async (req, res) => {
  try {
    const { currency_code, currency_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!currency_name || !currency_name.trim()) {
      return res.status(400).json({ message: 'Currency name is required.' });
    }

    const codeToUse = (currency_code && currency_code.trim()) ? currency_code.trim().toUpperCase() : currency_name.trim().substring(0, 5).toUpperCase();

    // Check duplicate
    let checkQuery = `SELECT * FROM tbl_company_def_currency WHERE (LOWER(currency_name) = LOWER($1) OR LOWER(currency_code) = LOWER($2)) AND is_deleted = 0`;
    let checkParams = [currency_name.trim(), codeToUse];
    if (clientId) {
      checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
      checkParams.push(clientId);
    }
    const checkResult = await db.query(checkQuery, checkParams);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ message: 'A currency with this code or name already exists.' });
    }

    const queryText = `
      INSERT INTO tbl_company_def_currency (currency_code, currency_name, status, client_id, is_deleted)
      VALUES ($1, $2, $3, $4, 0)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      codeToUse,
      currency_name.trim(),
      status || 'Active',
      clientId || null
    ]);

    res.status(201).json({
      message: 'Company default currency created successfully.',
      currency: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating company default currency:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateCompanyDefCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const { currency_code, currency_name, status } = req.body;

    let trimmedName = currency_name ? currency_name.trim() : null;
    let trimmedCode = currency_code ? currency_code.trim().toUpperCase() : null;

    if (trimmedName || trimmedCode) {
      const currentRes = await db.query('SELECT client_id FROM tbl_company_def_currency WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_company_def_currency WHERE (LOWER(currency_name) = LOWER($1) OR LOWER(currency_code) = LOWER($2)) AND id != $3 AND is_deleted = 0`;
      let checkParams = [trimmedName || '', trimmedCode || '', id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $4 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A currency with this code or name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_company_def_currency
      SET currency_code = COALESCE($1, currency_code),
          currency_name = COALESCE($2, currency_name),
          status = COALESCE($3, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND is_deleted = 0
      RETURNING *
    `;
    const result = await db.query(queryText, [
      trimmedCode,
      trimmedName,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company default currency not found or deleted.' });
    }

    res.status(200).json({
      message: 'Company default currency updated successfully.',
      currency: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating company default currency:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteCompanyDefCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_company_def_currency
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company default currency not found.' });
    }

    res.status(200).json({ message: 'Company default currency deleted successfully.' });
  } catch (error) {
    console.error('Error deleting company default currency:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
