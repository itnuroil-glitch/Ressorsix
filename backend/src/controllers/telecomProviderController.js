const db = require('../config/db');

exports.getAllTelecomProviders = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_telecom_provider 
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
    console.error('Error fetching telecom providers:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTelecomProvider = async (req, res) => {
  try {
    const { provider_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!provider_name || !provider_name.trim()) {
      return res.status(400).json({ message: 'Provider name is required.' });
    }

    // Split by comma in case user enters comma-separated list
    const providerList = provider_name
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (providerList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid provider name(s).' });
    }

    const insertedProviders = [];
    const skippedProviders = [];

    for (const item of providerList) {
      // Check for duplicate provider name scoped to this client
      let checkQuery = `SELECT * FROM tbl_telecom_provider WHERE LOWER(provider_name) = LOWER($1) AND is_deleted = 0`;
      let checkParams = [item];
      if (clientId) {
        checkQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        checkParams.push(clientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        skippedProviders.push(item);
        continue;
      }

      const queryText = `
        INSERT INTO tbl_telecom_provider (provider_name, status, client_id, is_deleted)
        VALUES ($1, $2, $3, 0)
        RETURNING *
      `;
      const result = await db.query(queryText, [
        item,
        status || 'Active',
        clientId || null
      ]);
      insertedProviders.push(result.rows[0]);
    }

    if (insertedProviders.length === 0 && skippedProviders.length > 0) {
      return res.status(409).json({
        message: `Provider name(s) already exist: ${skippedProviders.join(', ')}`
      });
    }

    const message = insertedProviders.length === 1
      ? 'Telecom provider created successfully.'
      : `${insertedProviders.length} Telecom providers created successfully.${skippedProviders.length > 0 ? ` (${skippedProviders.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      provider: insertedProviders[0],
      insertedProviders,
      skippedProviders
    });
  } catch (error) {
    console.error('Error creating telecom provider:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTelecomProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_name, status } = req.body;

    let trimmedName = provider_name ? provider_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_telecom_provider WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_telecom_provider WHERE LOWER(provider_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A telecom provider with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_telecom_provider
      SET provider_name = COALESCE($1, provider_name),
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
      return res.status(404).json({ message: 'Telecom provider not found or deleted.' });
    }

    res.status(200).json({
      message: 'Telecom provider updated successfully.',
      provider: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating telecom provider:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTelecomProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_telecom_provider
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom provider not found.' });
    }

    res.status(200).json({ message: 'Telecom provider deleted successfully.' });
  } catch (error) {
    console.error('Error deleting telecom provider:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
