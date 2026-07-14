const db = require('../config/db');

// @desc    Get all active modules
// @route   GET /api/modules
// @access  Public
exports.getAllModules = async (req, res) => {
  try {
    const queryText = `
      SELECT * FROM module 
      WHERE is_deleted = false 
      ORDER BY parent_id NULLS FIRST, id ASC
    `;
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching modules.' });
  }
};

// @desc    Create a new module
// @route   POST /api/modules
// @access  Public
exports.createModule = async (req, res) => {
  try {
    const { module_name, parent_id, status, route } = req.body;

    if (!module_name) {
      return res.status(400).json({ message: 'Module name is required.' });
    }

    const queryText = `
      INSERT INTO module (module_name, parent_id, status, is_deleted, route)
      VALUES ($1, $2, $3, false, $4)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      module_name.trim(),
      parent_id || null,
      status || 'active',
      route || null
    ]);

    res.status(201).json({
      message: 'Module created successfully.',
      module: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ message: 'Internal Server Error while creating module.' });
  }
};

// @desc    Update a module
// @route   PUT /api/modules/:id
// @access  Public
exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { module_name, parent_id, status, route } = req.body;

    // Check if module exists
    const checkQuery = 'SELECT id FROM module WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Module not found or has been deleted.' });
    }

    const queryText = `
      UPDATE module
      SET module_name = COALESCE($1, module_name),
          parent_id = $2,
          status = COALESCE($3, status),
          route = $4
      WHERE id = $5 AND is_deleted = false
      RETURNING *
    `;
    const result = await db.query(queryText, [
      module_name ? module_name.trim() : null,
      parent_id || null,
      status || null,
      route || null,
      id
    ]);

    res.status(200).json({
      message: 'Module updated successfully.',
      module: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ message: 'Internal Server Error while updating module.' });
  }
};

// @desc    Soft delete a module
// @route   DELETE /api/modules/:id
// @access  Public
exports.softDeleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if module exists
    const checkQuery = 'SELECT id FROM module WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Module not found or already deleted.' });
    }

    // Soft delete
    const deleteQuery = `
      UPDATE module
      SET is_deleted = true
      WHERE id = $1
      RETURNING id, module_name, is_deleted
    `;
    const result = await db.query(deleteQuery, [id]);

    res.status(200).json({
      message: 'Module deleted successfully (soft delete).',
      module: result.rows[0]
    });
  } catch (error) {
    console.error('Error soft-deleting module:', error);
    res.status(500).json({ message: 'Internal Server Error during module soft-deletion.' });
  }
};
