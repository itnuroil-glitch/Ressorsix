const db = require('../config/db');

// Tele Package master: reusable plan definitions (name, monthly amount and allowances)
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_package (
        id SERIAL PRIMARY KEY,
        package_name VARCHAR(255) NOT NULL,
        monthly_plan_amount NUMERIC(12, 2) DEFAULT 0.00,
        data_allowance VARCHAR(50),
        data_unit VARCHAR(20) DEFAULT 'GB',
        local_minutes VARCHAR(50),
        international_minutes VARCHAR(50),
        local_sms VARCHAR(50),
        international_sms VARCHAR(50),
        cug VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Error initializing tbl_tele_package:', err);
  }
};
initTable();

const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

const readAmount = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

exports.getAllTelePackages = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `SELECT * FROM tbl_tele_package WHERE is_deleted = 0`;
    const params = [];
    if (clientId) {
      params.push(String(clientId));
      queryText += ` AND (client_id = $1 OR client_id IS NULL)`;
    }
    queryText += ` ORDER BY id ASC`;
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching tele packages:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getTelePackageById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tbl_tele_package WHERE id = $1 AND is_deleted = 0', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele package not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tele package by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTelePackage = async (req, res) => {
  try {
    const b = req.body || {};
    const clientId = b.client_id || b.clientid || null;
    const name = clean(b.package_name);
    if (!name) {
      return res.status(400).json({ message: 'Package name is required.' });
    }
    const amount = readAmount(b.monthly_plan_amount);
    if (amount === null) {
      return res.status(400).json({ message: 'Monthly plan amount is required.' });
    }

    let dupQuery = `SELECT id FROM tbl_tele_package WHERE LOWER(package_name) = LOWER($1) AND is_deleted = 0`;
    const dupParams = [name];
    if (clientId) {
      dupQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
      dupParams.push(String(clientId));
    }
    const dup = await db.query(dupQuery, dupParams);
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: `Package "${name}" already exists.` });
    }

    const result = await db.query(
      `INSERT INTO tbl_tele_package
        (package_name, monthly_plan_amount, data_allowance, data_unit, local_minutes, international_minutes,
         local_sms, international_sms, cug, status, client_id, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0)
       RETURNING *`,
      [
        name, amount, clean(b.data_allowance), clean(b.data_unit) || 'GB', clean(b.local_minutes),
        clean(b.international_minutes), clean(b.local_sms), clean(b.international_sms), clean(b.cug),
        clean(b.status) || 'Active', clientId ? String(clientId) : null,
      ]
    );
    res.status(201).json({ message: 'Tele package created successfully.', package: result.rows[0] });
  } catch (error) {
    console.error('Error creating tele package:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTelePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const name = clean(b.package_name);
    if (!name) {
      return res.status(400).json({ message: 'Package name is required.' });
    }
    const amount = readAmount(b.monthly_plan_amount);
    if (amount === null) {
      return res.status(400).json({ message: 'Monthly plan amount is required.' });
    }

    const current = await db.query('SELECT client_id FROM tbl_tele_package WHERE id = $1 AND is_deleted = 0', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ message: 'Tele package not found.' });
    }
    const currentClientId = current.rows[0].client_id;
    let dupQuery = `SELECT id FROM tbl_tele_package WHERE LOWER(package_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
    const dupParams = [name, id];
    if (currentClientId) {
      dupQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
      dupParams.push(currentClientId);
    }
    const dup = await db.query(dupQuery, dupParams);
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'A package with this name already exists.' });
    }

    const result = await db.query(
      `UPDATE tbl_tele_package SET
         package_name = $1, monthly_plan_amount = $2, data_allowance = $3, data_unit = $4,
         local_minutes = $5, international_minutes = $6, local_sms = $7, international_sms = $8,
         cug = $9, status = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND is_deleted = 0
       RETURNING *`,
      [
        name, amount, clean(b.data_allowance), clean(b.data_unit) || 'GB', clean(b.local_minutes),
        clean(b.international_minutes), clean(b.local_sms), clean(b.international_sms), clean(b.cug),
        clean(b.status) || 'Active', id,
      ]
    );
    res.status(200).json({ message: 'Tele package updated successfully.', package: result.rows[0] });
  } catch (error) {
    console.error('Error updating tele package:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTelePackage = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE tbl_tele_package SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = 0 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele package not found or already deleted.' });
    }
    res.status(200).json({ message: 'Tele package deleted successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting tele package:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Build master packages from the plans already used on telecom connections.
// One package per distinct plan name (values taken from the latest connection that uses it);
// plan names already in the master are skipped, so it is safe to run more than once.
exports.importFromConnections = async (req, res) => {
  try {
    const result = await db.query(`
      INSERT INTO tbl_tele_package
        (package_name, monthly_plan_amount, data_allowance, data_unit, local_minutes, international_minutes,
         local_sms, international_sms, cug, status, client_id, is_deleted)
      SELECT DISTINCT ON (LOWER(TRIM(c.plan_name)))
        TRIM(c.plan_name), COALESCE(c.monthly_plan_amount, 0), c.data_allowance, COALESCE(c.data_unit, 'GB'),
        c.local_minutes, c.international_minutes, c.local_sms, c.international_sms, c.cug,
        'Active', c.client_id::text, 0
      FROM tbl_tele_connection c
      WHERE c.is_deleted = 0
        AND c.plan_name IS NOT NULL AND TRIM(c.plan_name) <> ''
        AND NOT (TRIM(c.plan_name) = 'Standard Plan' AND COALESCE(c.monthly_plan_amount, 0) = 0)
        AND NOT EXISTS (
          SELECT 1 FROM tbl_tele_package p
          WHERE p.is_deleted = 0 AND LOWER(p.package_name) = LOWER(TRIM(c.plan_name))
        )
      ORDER BY LOWER(TRIM(c.plan_name)), c.id DESC
      RETURNING id, package_name
    `);
    res.status(200).json({
      message: result.rows.length
        ? `${result.rows.length} package(s) imported from connections.`
        : 'No new packages to import.',
      imported: result.rows.length,
      packages: result.rows,
    });
  } catch (error) {
    console.error('Error importing tele packages from connections:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
