const db = require('../config/db');

exports.getAllPlans = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, COALESCE(json_agg(pm.enabled_module) FILTER (WHERE pm.enabled_module IS NOT NULL), '[]'::json) AS enabled_modules
      FROM tbl_plan p
      LEFT JOIN tbl_plan_modules pm ON p.id = pm.plan_id
      WHERE p.isdelete = false
      GROUP BY p.id
      ORDER BY p.price ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { plan_name, description, price, enabled_modules, status } = req.body;

    if (!plan_name) {
      return res.status(400).json({ message: 'plan_name is required' });
    }

    const result = await db.query(
      `INSERT INTO tbl_plan (plan_name, description, price, status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        plan_name.trim(),
        description || '',
        price || 0.00,
        status !== undefined ? status : 1
      ]
    );

    const newPlan = result.rows[0];

    if (Array.isArray(enabled_modules) && enabled_modules.length > 0) {
      for (const modId of enabled_modules) {
        await db.query(
          `INSERT INTO tbl_plan_modules (plan_id, enabled_module) VALUES ($1, $2)`,
          [newPlan.id, parseInt(modId, 10)]
        );
      }
    }

    newPlan.enabled_modules = enabled_modules || [];
    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_name, description, price, enabled_modules, status } = req.body;

    const result = await db.query(
      `UPDATE tbl_plan
       SET plan_name = COALESCE($1, plan_name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           status = COALESCE($4, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND isdelete = false RETURNING *`,
      [
        plan_name ? plan_name.trim() : null,
        description !== undefined ? description : null,
        price !== undefined ? price : null,
        status !== undefined ? status : null,
        id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Plan not found' });

    const updatedPlan = result.rows[0];

    if (enabled_modules !== undefined) {
      await db.query('DELETE FROM tbl_plan_modules WHERE plan_id = $1', [id]);
      
      if (Array.isArray(enabled_modules) && enabled_modules.length > 0) {
        for (const modId of enabled_modules) {
          await db.query(
            `INSERT INTO tbl_plan_modules (plan_id, enabled_module) VALUES ($1, $2)`,
            [id, parseInt(modId, 10)]
          );
        }
      }
    }

    updatedPlan.enabled_modules = enabled_modules !== undefined ? enabled_modules : [];
    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE tbl_plan SET isdelete = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Plan not found' });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: error.message });
  }
};
