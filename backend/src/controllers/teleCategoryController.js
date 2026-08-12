const db = require('../config/db');

// Ensure table exists
const initTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_tele_category (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(100) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Error initializing tbl_tele_category:', err);
  }
};
initTable();

exports.getAllTeleCategories = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_tele_category 
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
    console.error('Error fetching tele categories:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getTeleCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_tele_category WHERE id = $1 AND is_deleted = 0', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele category not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tele category by id:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createTeleCategory = async (req, res) => {
  try {
    const { category_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    // Split by comma in case user enters comma-separated list
    const categoryList = category_name
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (categoryList.length === 0) {
      return res.status(400).json({ message: 'Please enter valid category name(s).' });
    }

    const insertedCategories = [];
    const skippedCategories = [];

    for (const item of categoryList) {
      // Check for duplicate category name scoped to this client
      let checkQuery = `SELECT * FROM tbl_tele_category WHERE LOWER(category_name) = LOWER($1) AND is_deleted = 0`;
      let checkParams = [item];
      if (clientId) {
        checkQuery += ` AND (client_id = $2 OR client_id IS NULL)`;
        checkParams.push(clientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        skippedCategories.push(item);
        continue;
      }

      const queryText = `
        INSERT INTO tbl_tele_category (category_name, status, client_id, is_deleted)
        VALUES ($1, $2, $3, 0)
        RETURNING *
      `;
      const result = await db.query(queryText, [
        item,
        status || 'Active',
        clientId || null
      ]);
      insertedCategories.push(result.rows[0]);
    }

    if (insertedCategories.length === 0 && skippedCategories.length > 0) {
      return res.status(409).json({
        message: `Category name(s) already exist: ${skippedCategories.join(', ')}`
      });
    }

    const message = insertedCategories.length === 1
      ? 'Tele category created successfully.'
      : `${insertedCategories.length} Tele categories created successfully.${skippedCategories.length > 0 ? ` (${skippedCategories.length} skipped as duplicates)` : ''}`;

    res.status(201).json({
      message,
      category: insertedCategories[0],
      insertedCategories,
      skippedCategories
    });
  } catch (error) {
    console.error('Error creating tele category:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateTeleCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, status } = req.body;

    let trimmedName = category_name ? category_name.trim() : null;

    if (trimmedName) {
      const currentRes = await db.query('SELECT client_id FROM tbl_tele_category WHERE id = $1', [id]);
      const currentClientId = currentRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_tele_category WHERE LOWER(category_name) = LOWER($1) AND id != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND (client_id = $3 OR client_id IS NULL)`;
        checkParams.push(currentClientId);
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A tele category with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_tele_category
      SET category_name = COALESCE($1, category_name),
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
      return res.status(404).json({ message: 'Tele category not found or deleted.' });
    }

    res.status(200).json({
      message: 'Tele category updated successfully.',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tele category:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteTeleCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_tele_category
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tele category not found.' });
    }

    res.status(200).json({ message: 'Tele category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting tele category:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
