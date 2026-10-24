const db = require('../config/db');

// Tele Service Provider master: which service provider (e&, du, ...) a company uses, with its account number
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_service_provider (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        connection_type VARCHAR(255),
        service_provider VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`
      ALTER TABLE tbl_tele_service_provider
      ADD COLUMN IF NOT EXISTS connection_type VARCHAR(255);
    `);

    // Backfill legacy rows only when an existing connection gives one unambiguous type
    // for the same company, provider and account number. Unknown rows remain NULL.
    await db.query(`
      UPDATE tbl_tele_service_provider AS service
      SET connection_type = matched.connection_type,
          updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT
          LOWER(TRIM(company_name)) AS company_key,
          LOWER(TRIM(provider)) AS provider_key,
          LOWER(TRIM(account_number)) AS account_key,
          MIN(TRIM(connection_type)) AS connection_type
        FROM tbl_tele_connection
        WHERE is_deleted = 0
          AND NULLIF(TRIM(account_number), '') IS NOT NULL
          AND NULLIF(TRIM(connection_type), '') IS NOT NULL
        GROUP BY
          LOWER(TRIM(company_name)),
          LOWER(TRIM(provider)),
          LOWER(TRIM(account_number))
        HAVING COUNT(DISTINCT LOWER(TRIM(connection_type))) = 1
      ) AS matched
      WHERE NULLIF(TRIM(service.connection_type), '') IS NULL
        AND LOWER(TRIM(service.company_name)) = matched.company_key
        AND LOWER(TRIM(service.service_provider)) = matched.provider_key
        AND LOWER(TRIM(service.account_number)) = matched.account_key;
    `);

    // Before this field existed, the telecom module treated an omitted
    // connection type as SIM. Preserve that legacy behaviour for active rows
    // that have no exact connection match, while leaving deleted history alone.
    await db.query(`
      UPDATE tbl_tele_service_provider
      SET connection_type = 'SIM',
          updated_at = CURRENT_TIMESTAMP
      WHERE is_deleted = 0
        AND NULLIF(TRIM(connection_type), '') IS NULL;
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
  if (!clean(b.connection_type)) missing.push('Connection Type');
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
    const connectionType = clean(b.connection_type);
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
      `INSERT INTO tbl_tele_service_provider
         (company_name, connection_type, service_provider, account_number, status, client_id, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, 0) RETURNING *`,
      [company, connectionType, provider, account, clean(b.status) || 'Active', clientId ? String(clientId) : null]
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
    const connectionType = clean(b.connection_type);
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
       SET company_name = $1, connection_type = $2, service_provider = $3, account_number = $4,
           status = COALESCE($5, status), updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND is_deleted = 0 RETURNING *`,
      [company, connectionType, provider, account, clean(b.status) || null, id]
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
