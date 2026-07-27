const db = require('../config/db');

// @desc    Get all premises types
// @route   GET /api/premises-types
// @access  Public
exports.getAllPremisesTypes = async (req, res) => {
  try {
    const queryText = "SELECT * FROM tbl_premises_type_details WHERE is_deleted = false ORDER BY id ASC";
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching premises types:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching premises types.' });
  }
};

// @desc    Create a new premises type
// @route   POST /api/premises-types
// @access  Public
exports.createPremisesType = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Premises type name is required.' });
    }

    const queryText = `
      INSERT INTO tbl_premises_type_details (name)
      VALUES ($1)
      RETURNING *
    `;
    const result = await db.query(queryText, [name.trim()]);

    res.status(201).json({
      message: 'Premises type created successfully.',
      premisesType: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating premises type:', error);
    res.status(500).json({ message: 'Internal Server Error while creating premises type.' });
  }
};

// @desc    Update a premises type
// @route   PUT /api/premises-types/:id
// @access  Public
exports.updatePremisesType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Premises type name is required for update.' });
    }

    // Check if exists
    const checkQuery = 'SELECT id FROM tbl_premises_type_details WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Premises type not found.' });
    }

    const queryText = `
      UPDATE tbl_premises_type_details
      SET name = $1, status = COALESCE($2, status), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(queryText, [name.trim(), status, id]);

    res.status(200).json({
      message: 'Premises type updated successfully.',
      premisesType: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating premises type:', error);
    res.status(500).json({ message: 'Internal Server Error while updating premises type.' });
  }
};

// @desc    Delete a premises type (soft delete)
// @route   DELETE /api/premises-types/:id
// @access  Public
exports.deletePremisesType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const checkQuery = 'SELECT id FROM tbl_premises_type_details WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Premises type not found or already deleted.' });
    }

    const deleteQuery = 'UPDATE tbl_premises_type_details SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(deleteQuery, [id]);

    res.status(200).json({
      message: 'Premises type deleted successfully.',
      premisesType: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting premises type:', error);
    res.status(500).json({ message: 'Internal Server Error during premises type deletion.' });
  }
};
