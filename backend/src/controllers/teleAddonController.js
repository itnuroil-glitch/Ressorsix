const db = require('../config/db');

const clean = (value) => (
  value === undefined || value === null || String(value).trim() === ''
    ? null
    : String(value).trim()
);

const readAmount = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const normalizeFrequency = (value) => (
  String(value || '').trim().toLowerCase().replace(/[\s_-]/g, '') === 'onetime'
    ? 'One Time'
    : 'Recurring'
);

const initTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tbl_tele_addon (
      id SERIAL PRIMARY KEY,
      tele_connection_id INTEGER NOT NULL REFERENCES tbl_tele_connection(id) ON DELETE CASCADE,
      package_plan_name VARCHAR(255) NOT NULL,
      monthly_plan_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      data_allowance VARCHAR(50),
      billing_frequency VARCHAR(20) DEFAULT 'Recurring',
      local_minutes VARCHAR(50),
      international_minutes VARCHAR(50),
      local_sms VARCHAR(50),
      international_sms VARCHAR(50),
      cug VARCHAR(50),
      client_id VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      is_deleted INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_tele_addon_connection
    ON tbl_tele_addon (tele_connection_id)
  `);
};

const migrateLegacyPackageAddons = async () => {
  const tableCheck = await db.query(`SELECT to_regclass('public.tbl_add_on') AS table_name`);
  if (!tableCheck.rows[0]?.table_name) return;

  const legacy = await db.query(`
    SELECT tele_id, client_id, plan_name, plan_amount, subscription_type, addon_details, status
    FROM tbl_add_on
    WHERE tele_id IS NOT NULL
      AND LOWER(COALESCE(addon_type, '')) = 'package plan'
      AND COALESCE(plan_name, '') <> ''
  `);

  for (const row of legacy.rows) {
    let details = {};
    try {
      details = typeof row.addon_details === 'string'
        ? JSON.parse(row.addon_details)
        : (row.addon_details || {});
    } catch (error) {
      details = {};
    }

    await db.query(
      `INSERT INTO tbl_tele_addon (
         tele_connection_id, package_plan_name, monthly_plan_amount, data_allowance,
         billing_frequency, local_minutes, international_minutes, local_sms, international_sms,
         cug, client_id, status, is_deleted
       )
       SELECT $1, $2::varchar, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0
       WHERE EXISTS (
         SELECT 1 FROM tbl_tele_connection WHERE id = $1 AND is_deleted = 0
       )
       AND NOT EXISTS (
         SELECT 1 FROM tbl_tele_addon
         WHERE tele_connection_id = $1
           AND LOWER(package_plan_name) = LOWER($2::text)
           AND is_deleted = 0
       )`,
      [
        row.tele_id,
        clean(row.plan_name),
        readAmount(row.plan_amount) || 0,
        clean(details.data_allowance),
        normalizeFrequency(row.subscription_type),
        clean(details.local_minutes),
        clean(details.international_minutes),
        clean(details.local_sms),
        clean(details.international_sms),
        clean(details.cug),
        row.client_id === null || row.client_id === undefined ? null : String(row.client_id),
        clean(row.status) || 'Active',
      ]
    );
  }
};

const ready = initTable()
  .then(migrateLegacyPackageAddons)
  .catch(error => console.error('Error initializing tbl_tele_addon:', error));

const readPayload = (body = {}) => ({
  teleConnectionId: Number.parseInt(body.tele_connection_id, 10),
  packagePlanName: clean(body.package_plan_name),
  monthlyPlanAmount: readAmount(body.monthly_plan_amount),
  dataAllowance: clean(body.data_allowance),
  billingFrequency: normalizeFrequency(body.billing_frequency),
  localMinutes: clean(body.local_minutes),
  internationalMinutes: clean(body.international_minutes),
  localSms: clean(body.local_sms),
  internationalSms: clean(body.international_sms),
  cug: clean(body.cug),
  clientId: body.client_id === undefined || body.client_id === null ? null : String(body.client_id),
  status: clean(body.status) || 'Active',
});

const validatePayload = async (payload, res) => {
  if (!Number.isInteger(payload.teleConnectionId)) {
    res.status(400).json({ message: 'Telecom connection is required.' });
    return false;
  }
  if (!payload.packagePlanName) {
    res.status(400).json({ message: 'Package plan name is required.' });
    return false;
  }
  if (payload.monthlyPlanAmount === null) {
    res.status(400).json({ message: 'Monthly plan amount is required.' });
    return false;
  }
  const connection = await db.query(
    'SELECT id FROM tbl_tele_connection WHERE id = $1 AND is_deleted = 0',
    [payload.teleConnectionId]
  );
  if (connection.rows.length === 0) {
    res.status(404).json({ message: 'Telecom connection not found.' });
    return false;
  }
  return true;
};

exports.getAllTeleAddons = async (req, res) => {
  try {
    await ready;
    const connectionId = req.query.tele_connection_id;
    const params = [];
    let query = `SELECT * FROM tbl_tele_addon WHERE is_deleted = 0`;
    if (connectionId) {
      params.push(connectionId);
      query += ` AND tele_connection_id = $1`;
    }
    query += ` ORDER BY id DESC`;
    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching telecom add-ons:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTeleAddon = async (req, res) => {
  try {
    await ready;
    const payload = readPayload(req.body);
    if (!(await validatePayload(payload, res))) return;

    const result = await db.query(
      `INSERT INTO tbl_tele_addon (
         tele_connection_id, package_plan_name, monthly_plan_amount, data_allowance,
         billing_frequency, local_minutes, international_minutes, local_sms, international_sms,
         cug, client_id, status, is_deleted
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
       RETURNING *`,
      [
        payload.teleConnectionId, payload.packagePlanName, payload.monthlyPlanAmount,
        payload.dataAllowance, payload.billingFrequency, payload.localMinutes,
        payload.internationalMinutes, payload.localSms, payload.internationalSms, payload.cug,
        payload.clientId, payload.status,
      ]
    );
    res.status(201).json({ message: 'Telecom add-on created successfully.', addon: result.rows[0] });
  } catch (error) {
    console.error('Error creating telecom add-on:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTeleAddon = async (req, res) => {
  try {
    await ready;
    const payload = readPayload(req.body);
    if (!(await validatePayload(payload, res))) return;
    const result = await db.query(
      `UPDATE tbl_tele_addon SET
         tele_connection_id = $1, package_plan_name = $2, monthly_plan_amount = $3,
         data_allowance = $4, billing_frequency = $5, local_minutes = $6,
         international_minutes = $7, local_sms = $8, international_sms = $9, cug = $10,
         client_id = $11, status = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 AND is_deleted = 0
       RETURNING *`,
      [
        payload.teleConnectionId, payload.packagePlanName, payload.monthlyPlanAmount,
        payload.dataAllowance, payload.billingFrequency, payload.localMinutes,
        payload.internationalMinutes, payload.localSms, payload.internationalSms, payload.cug,
        payload.clientId, payload.status, req.params.id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Telecom add-on not found.' });
    res.status(200).json({ message: 'Telecom add-on updated successfully.', addon: result.rows[0] });
  } catch (error) {
    console.error('Error updating telecom add-on:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTeleAddon = async (req, res) => {
  try {
    await ready;
    const result = await db.query(
      `UPDATE tbl_tele_addon
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = 0
       RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Telecom add-on not found.' });
    res.status(200).json({ message: 'Telecom add-on deleted successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting telecom add-on:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

