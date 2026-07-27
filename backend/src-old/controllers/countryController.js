const db = require('../config/db');

// @desc    Get all countries
// @route   GET /api/countries
// @access  Public
exports.getAllCountries = async (req, res) => {
  try {
    const queryText = 'SELECT * FROM country WHERE is_deleted = 0 ORDER BY id ASC';
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching countries.' });
  }
};

// @desc    Create a new country
// @route   POST /api/countries
// @access  Public
exports.createCountry = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Country name is required.' });
    }

    const queryText = `
      INSERT INTO country (name)
      VALUES ($1)
      RETURNING *
    `;
    const result = await db.query(queryText, [name.trim()]);

    res.status(201).json({
      message: 'Country created successfully.',
      country: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating country:', error);
    res.status(500).json({ message: 'Internal Server Error while creating country.' });
  }
};

// @desc    Update a country
// @route   PUT /api/countries/:id
// @access  Public
exports.updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Country name is required for update.' });
    }

    // Check if country exists and is not deleted
    const checkQuery = 'SELECT id FROM country WHERE id = $1 AND is_deleted = 0';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Country not found or has been deleted.' });
    }

    const queryText = `
      UPDATE country
      SET name = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(queryText, [name.trim(), id]);

    res.status(200).json({
      message: 'Country updated successfully.',
      country: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating country:', error);
    res.status(500).json({ message: 'Internal Server Error while updating country.' });
  }
};

// @desc    Delete a country
// @route   DELETE /api/countries/:id
// @access  Public
exports.deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if country exists and is not deleted
    const checkQuery = 'SELECT id FROM country WHERE id = $1 AND is_deleted = 0';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Country not found or already deleted.' });
    }

    const deleteQuery = 'UPDATE country SET is_deleted = 1 WHERE id = $1 RETURNING id, name, is_deleted';
    const result = await db.query(deleteQuery, [id]);

    res.status(200).json({
      message: 'Country deleted successfully (soft delete).',
      country: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting country:', error);
    res.status(500).json({ message: 'Internal Server Error during country deletion.' });
  }
};

// @desc    Restore a soft-deleted country
// @route   PUT /api/countries/:id/restore
// @access  Public
exports.restoreCountry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if country exists
    const checkQuery = 'SELECT id FROM country WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Country not found.' });
    }

    const restoreQuery = 'UPDATE country SET is_deleted = 0 WHERE id = $1 RETURNING id, name, is_deleted';
    const result = await db.query(restoreQuery, [id]);

    res.status(200).json({
      message: 'Country restored successfully.',
      country: result.rows[0]
    });
  } catch (error) {
    console.error('Error restoring country:', error);
    res.status(500).json({ message: 'Internal Server Error during country restoration.' });
  }
};
