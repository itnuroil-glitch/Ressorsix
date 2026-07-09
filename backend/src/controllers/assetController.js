const db = require('../config/db');

// Get all non-deleted assets
exports.getAllAssets = async (req, res) => {
  try {
    const queryText = `
      SELECT * FROM tbl_asset 
      WHERE is_deleted = 0 
      ORDER BY asset_id DESC
    `;
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Create a new asset
exports.createAsset = async (req, res) => {
  try {
    const {
      asset_tag_number,
      category_id,
      brand_id,
      serial_number,
      assigned_employee_id,
      status
    } = req.body;

    if (!asset_tag_number) {
      return res.status(400).json({ message: 'Asset tag number is required.' });
    }

    // Check for duplicate asset tag number
    const checkQuery = `SELECT * FROM tbl_asset WHERE LOWER(asset_tag_number) = LOWER($1) AND is_deleted = 0`;
    const checkResult = await db.query(checkQuery, [asset_tag_number.trim()]);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ message: 'An asset with this tag number already exists.' });
    }

    const queryText = `
      INSERT INTO tbl_asset (
        asset_tag_number, category_id, brand_id, serial_number, assigned_employee_id, status, is_deleted
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING *
    `;

    const result = await db.query(queryText, [
      asset_tag_number.trim(),
      category_id || null,
      brand_id || null,
      serial_number ? serial_number.trim() : null,
      assigned_employee_id || null,
      status || 'In Stock'
    ]);

    res.status(201).json({
      message: 'Asset created successfully.',
      asset: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Update an existing asset
exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      asset_tag_number,
      category_id,
      brand_id,
      serial_number,
      assigned_employee_id,
      status
    } = req.body;

    let trimmedTag = asset_tag_number ? asset_tag_number.trim() : null;

    if (trimmedTag) {
      // Check for duplicate asset tag number excluding the current one
      const checkQuery = `SELECT * FROM tbl_asset WHERE LOWER(asset_tag_number) = LOWER($1) AND asset_id != $2 AND is_deleted = 0`;
      const checkResult = await db.query(checkQuery, [trimmedTag, id]);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'An asset with this tag number already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_asset
      SET asset_tag_number = COALESCE($1, asset_tag_number),
          category_id = COALESCE($2, category_id),
          brand_id = COALESCE($3, brand_id),
          serial_number = COALESCE($4, serial_number),
          assigned_employee_id = COALESCE($5, assigned_employee_id),
          status = COALESCE($6, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE asset_id = $7 AND is_deleted = 0
      RETURNING *
    `;
    const result = await db.query(queryText, [
      trimmedTag,
      category_id || null,
      brand_id || null,
      serial_number ? serial_number.trim() : null,
      assigned_employee_id || null,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found or deleted.' });
    }

    res.status(200).json({
      message: 'Asset updated successfully.',
      asset: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Delete (soft delete) an asset
exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_asset
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE asset_id = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    res.status(200).json({ message: 'Asset deleted successfully.' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
