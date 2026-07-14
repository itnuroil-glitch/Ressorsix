const db = require('../config/db');

// @desc    Get all states (with their parent country name)
// @route   GET /api/states
// @access  Public
exports.getAllStates = async (req, res) => {
  try {
    const queryText = `
      SELECT s.*, c.name AS country_name 
      FROM state s
      LEFT JOIN country c ON s.country_id = c.id
      ORDER BY s.id ASC
    `;
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching states.' });
  }
};

// @desc    Create a new state
// @route   POST /api/states
// @access  Public
exports.createState = async (req, res) => {
  try {
    const { name, country_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'State name is required.' });
    }

    if (!country_id) {
      return res.status(400).json({ message: 'Country association (country_id) is required.' });
    }

    // Check if country exists
    const countryCheck = 'SELECT id FROM country WHERE id = $1';
    const countryCheckResult = await db.query(countryCheck, [country_id]);
    if (countryCheckResult.rows.length === 0) {
      return res.status(400).json({ message: 'Associated country does not exist.' });
    }

    const queryText = `
      INSERT INTO state (name, country_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(queryText, [name.trim(), country_id]);

    // Fetch the inserted state with its country name
    const fetchInserted = `
      SELECT s.*, c.name AS country_name 
      FROM state s
      LEFT JOIN country c ON s.country_id = c.id
      WHERE s.id = $1
    `;
    const insertedResult = await db.query(fetchInserted, [result.rows[0].id]);

    res.status(201).json({
      message: 'State created successfully.',
      state: insertedResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating state:', error);
    res.status(500).json({ message: 'Internal Server Error while creating state.' });
  }
};

// @desc    Update an existing state
// @route   PUT /api/states/:id
// @access  Public
exports.updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'State name is required.' });
    }

    if (!country_id) {
      return res.status(400).json({ message: 'Country association (country_id) is required.' });
    }

    // Check if state exists
    const checkQuery = 'SELECT id FROM state WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'State not found.' });
    }

    // Check if country exists
    const countryCheck = 'SELECT id FROM country WHERE id = $1';
    const countryCheckResult = await db.query(countryCheck, [country_id]);
    if (countryCheckResult.rows.length === 0) {
      return res.status(400).json({ message: 'Associated country does not exist.' });
    }

    const queryText = `
      UPDATE state
      SET name = $1, country_id = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(queryText, [name.trim(), country_id, id]);

    // Fetch updated state with country name
    const fetchUpdated = `
      SELECT s.*, c.name AS country_name 
      FROM state s
      LEFT JOIN country c ON s.country_id = c.id
      WHERE s.id = $1
    `;
    const updatedResult = await db.query(fetchUpdated, [result.rows[0].id]);

    res.status(200).json({
      message: 'State updated successfully.',
      state: updatedResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating state:', error);
    res.status(500).json({ message: 'Internal Server Error while updating state.' });
  }
};

// @desc    Delete a state
// @route   DELETE /api/states/:id
// @access  Public
exports.deleteState = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if state exists
    const checkQuery = 'SELECT id FROM state WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'State not found.' });
    }

    const deleteQuery = 'DELETE FROM state WHERE id = $1 RETURNING id, name';
    const result = await db.query(deleteQuery, [id]);

    res.status(200).json({
      message: 'State deleted successfully.',
      state: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting state:', error);
    res.status(500).json({ message: 'Internal Server Error during state deletion.' });
  }
};

// @desc    Get states by country ID
// @route   GET /api/states/country/:countryId
// @access  Public
exports.getStatesByCountry = async (req, res) => {
  try {
    let countryId = req.params.countryId || req.params.countryid || req.query.countryId || req.query.countryid;
    if (!countryId || String(countryId).trim() === '') {
      const countryRes = await db.query('SELECT id FROM country ORDER BY id ASC LIMIT 1');
      if (countryRes.rows.length > 0) {
        countryId = countryRes.rows[0].id;
      }
    }

    if (!countryId) {
      return res.status(400).json({ message: 'Country ID is required and no country found.' });
    }

    const queryText = `
      SELECT id, name, country_id 
      FROM state
      WHERE country_id = $1
      ORDER BY name ASC
    `;
    const result = await db.query(queryText, [countryId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching states by country:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching states by country.' });
  }
};
