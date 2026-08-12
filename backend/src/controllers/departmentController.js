const db = require('../config/db');

// @desc    Get all active departments (optionally filtered by client_id / clientid)
// @route   GET /api/departments
// @access  Public
exports.getAllDepartments = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    if (clientId) {
      try {
        const queryText = `
          SELECT * FROM department 
          WHERE is_delete = false AND (clientid = $1 OR client_id = $1 OR clientid IS NULL)
          ORDER BY id ASC
        `;
        const result = await db.query(queryText, [clientId]);
        return res.status(200).json(result.rows);
      } catch (err) {
        // Fallback if clientid column does not exist on department table
        const queryText = `
          SELECT * FROM department 
          WHERE is_delete = false 
          ORDER BY id ASC
        `;
        const result = await db.query(queryText);
        return res.status(200).json(result.rows);
      }
    }

    const queryText = `
      SELECT * FROM department 
      WHERE is_delete = false 
      ORDER BY id ASC
    `;
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching departments.' });
  }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Public
exports.createDepartment = async (req, res) => {
  try {
    const { department_name, status } = req.body;

    if (!department_name) {
      return res.status(400).json({ message: 'Department name is required.' });
    }

    const queryText = `
      INSERT INTO department (department_name, status, is_delete)
      VALUES ($1, $2, false)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      department_name.trim(),
      status !== undefined ? parseInt(status, 10) : 1
    ]);

    res.status(201).json({
      message: 'Department created successfully.',
      department: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Internal Server Error while creating department.' });
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Public
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, status } = req.body;

    // Check if department exists
    const checkQuery = 'SELECT id FROM department WHERE id = $1 AND is_delete = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found or has been deleted.' });
    }

    const queryText = `
      UPDATE department
      SET department_name = COALESCE($1, department_name),
          status = COALESCE($2, status)
      WHERE id = $3 AND is_delete = false
      RETURNING *
    `;
    const result = await db.query(queryText, [
      department_name ? department_name.trim() : null,
      status !== undefined ? parseInt(status, 10) : null,
      id
    ]);

    res.status(200).json({
      message: 'Department updated successfully.',
      department: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Internal Server Error while updating department.' });
  }
};

// @desc    Soft delete a department
// @route   DELETE /api/departments/:id
// @access  Public
exports.softDeleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const checkQuery = 'SELECT id FROM department WHERE id = $1 AND is_delete = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found or already deleted.' });
    }

    // Soft delete
    const deleteQuery = `
      UPDATE department
      SET is_delete = true
      WHERE id = $1
      RETURNING id, department_name, is_delete
    `;
    const result = await db.query(deleteQuery, [id]);

    res.status(200).json({
      message: 'Department deleted successfully (soft delete).',
      department: result.rows[0]
    });
  } catch (error) {
    console.error('Error soft-deleting department:', error);
    res.status(500).json({ message: 'Internal Server Error during department soft-deletion.' });
  }
};
