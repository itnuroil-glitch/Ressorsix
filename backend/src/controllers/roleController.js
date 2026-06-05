const db = require('../config/db');

// @desc    Get all active roles
// @route   GET /api/roles
// @access  Public
exports.getAllRoles = async (req, res) => {
  try {
    const { clientid, roleid } = req.query;

    let queryText = `
      SELECT * FROM role 
      WHERE is_deleted = false 
    `;
    const params = [];

    if (roleid && parseInt(roleid) === 1) {
      // Superadmin sees all roles, do not filter by clientid
    } else if (clientid) {
      // Client sees ONLY their own roles
      queryText += ` AND clientid = $1 `;
      params.push(clientid);
    } else {
      queryText += ` AND clientid IS NULL `;
    }
    
    queryText += ` ORDER BY id ASC`;
    
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching roles.' });
  }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Public
exports.createRole = async (req, res) => {
  try {
    const { role, status, clientid } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role name is required.' });
    }

    const queryText = `
      INSERT INTO role (role, status, clientid, is_deleted)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      role.trim(),
      status !== undefined ? parseInt(status, 10) : 1,
      clientid ? parseInt(clientid, 10) : null
    ]);

    res.status(201).json({
      message: 'Role created successfully.',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Internal Server Error while creating role.' });
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Public
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    // Check if role exists
    const checkQuery = 'SELECT id FROM role WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or has been deleted.' });
    }

    const queryText = `
      UPDATE role
      SET role = COALESCE($1, role),
          status = COALESCE($2, status)
      WHERE id = $3 AND is_deleted = false
      RETURNING *
    `;
    const result = await db.query(queryText, [
      role ? role.trim() : null,
      status !== undefined ? parseInt(status, 10) : null,
      id
    ]);

    res.status(200).json({
      message: 'Role updated successfully.',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Internal Server Error while updating role.' });
  }
};

// @desc    Soft delete a role
// @route   DELETE /api/roles/:id
// @access  Public
exports.softDeleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const checkQuery = 'SELECT id FROM role WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or already deleted.' });
    }

    // Soft delete
    const deleteQuery = `
      UPDATE role
      SET is_deleted = true
      WHERE id = $1
      RETURNING id, role, is_deleted
    `;
    const result = await db.query(deleteQuery, [id]);

    res.status(200).json({
      message: 'Role deleted successfully (soft delete).',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Error soft-deleting role:', error);
    res.status(500).json({ message: 'Internal Server Error during role soft-deletion.' });
  }
};
