const db = require('../config/db');

// Tele Service Provider master: which service provider (e&, du, ...) a company uses, with its account number
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_service_provider (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        service_provider VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Error initializing tbl_tele_service_provider:', err);
  }
};
initTable();

const clean = (v) => (v === undefined || v === null ? '' : String(v).trim());

const validate = (b) => {
  const missing = [];
  if (!clean(b.company_name)) missing.push('Company');
  if (!clean(b.service_provider)) missing.push('Service Provider');
  if (!clean(b.account_number)) missing.push('Account Number');
  return missing;
};

exports.getAllTeleServiceProviders = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `SELECT * FROM tbl_tele_service_provider WHERE is_deleted = 0`;
    const params = [];
    if (clientId) {
      params.push(String(clientId));
      queryText += ` AND (client_id = $1 OR client_id IS NULL)`;
    }
    queryText += ` ORDER BY id ASC`;
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching tele service providers:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTeleServiceProvider = async (req, res) => {
  try {
    const b = req.body || {};
    const missing = validate(b);
    if (missing.length > 0) {
      return res.status(400).json({ message: `Required: ${missing.join(', ')}.` });
    }
    const company = clean(b.company_name);
    const provider = clean(b.service_provider);
    const account = clean(b.account_number);
    const clientId = b.client_id || b.clientid || null;

    const dup = await db.query(
      `SELECT id FROM tbl_tele_service_provider
       WHERE LOWER(company_name) = LOWER($1) AND LOWER(service_provider) = LOWER($2)
         AND LOWER(account_number) = LOWER($3) AND is_deleted = 0`,
      [company, provider, account]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'This company, service provider and account number already exist.' });
    }

    const result = await db.query(
      `INSERT INTO tbl_tele_service_provider (company_name, service_provider, account_number, status, client_id, is_deleted)
       VALUES ($1, $2, $3, $4, $5, 0) RETURNING *`,
      [company, provider, account, clean(b.status) || 'Active', clientId ? String(clientId) : null]
    );
    res.status(201).json({ message: 'Tele service provider created successfully.', serviceProvider: result.rows[0] });
  } catch (error) {
    console.error('Error creating tele service provider:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTeleServiceProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const missing = validate(b);
    if (missing.length > 0) {
      return res.status(400).json({ message: `Required: ${missing.join(', ')}.` });
    }
    const company = clean(b.company_name);
    const provider = clean(b.service_provider);
    const account = clean(b.account_number);

    const dup = await db.query(
      `SELECT id FROM tbl_tele_service_provider
       WHERE LOWER(company_name) = LOWER($1) AND LOWER(service_provider) = LOWER($2)
         AND LOWER(account_number) = LOWER($3) AND id != $4 AND is_deleted = 0`,
      [company, provider, account, id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'This company, service provider and account number already exist.' });
    }

    const result = await db.query(
      `UPDATE tbl_tele_service_provider
       SET company_name = $1, service_provider = $2, account_number = $3,
           status = COALESCE($4, status), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND is_deleted = 0 RETURNING *`,
      [company, provider, account, clean(b.status) || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele service provider not found.' });
    }
    res.status(200).json({ message: 'Tele service provider updated successfully.', serviceProvider: result.rows[0] });
  } catch (error) {
    console.error('Error updating tele service provider:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTeleServiceProvider = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE tbl_tele_service_provider SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = 0 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele service provider not found or already deleted.' });
    }
    res.status(200).json({ message: 'Tele service provider deleted successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting tele service provider:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
