const db = require('../config/db');

exports.getAllSimPlans = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_sim_plan 
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
    console.error('Error fetching SIM plan names:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createSimPlan = async (req, res) => {
  try {
    const { plan_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!plan_name || !plan_name.trim()) {
      return res.status(400).json({ message: 'Plan name is required.' });
    }

    // Split by comma in case user enters comma-separated list
    const planList = plan_name
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (planList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid plan name(s).' });
    }

    const insertedPlans = [];
    const skippedPlans = [];

    for (const item of planList) {
      // Check for duplicate plan name scoped to this client
      let checkQuery = `SELECT * FROM tbl_sim_plan WHERE LOWER(plan_name) = LOWER($1) AND is_deleted = 0`;
      let checkParams = [item];
      if (clientId) {
        checkQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        checkParams.push(clientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        skippedPlans.push(item);
        continue;
      }

      const queryText = `
        INSERT INTO tbl_sim_plan (plan_name, status, client_id, is_deleted)
        VALUES ($1, $2, $3, 0)
        RETURNING *
      `;
      const result = await db.query(queryText, [
        item,
        status || 'Active',
        clientId || null
      ]);
      insertedPlans.push(result.rows[0]);
    }

    if (insertedPlans.length === 0 && skippedPlans.length > 0) {
      return res.status(409).json({
        message: `Plan name(s) already exist: ${skippedPlans.join(', ')}`
      });
    }

    const message = insertedPlans.length === 1
      ? 'SIM plan created successfully.'
      : `${insertedPlans.length} SIM plans created successfully.${skippedPlans.length > 0 ? ` (${skippedPlans.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      plan: insertedPlans[0],
      insertedPlans,
      skippedPlans
    });
  } catch (error) {
    console.error('Error creating SIM plan:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateSimPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_name, status } = req.body;

    let trimmedName = plan_name ? plan_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_sim_plan WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_sim_plan WHERE LOWER(plan_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A SIM plan with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_sim_plan
      SET plan_name = COALESCE($1, plan_name),
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
      return res.status(404).json({ message: 'SIM plan not found or deleted.' });
    }

    res.status(200).json({
      message: 'SIM plan updated successfully.',
      plan: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating SIM plan:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteSimPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_sim_plan
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM plan not found.' });
    }

    res.status(200).json({ message: 'SIM plan deleted successfully.' });
  } catch (error) {
    console.error('Error deleting SIM plan:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
