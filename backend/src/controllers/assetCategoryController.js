const db = require('../config/db');

exports.getAllAssetCategories = async (req, res) => {
  try {
    const queryText = `
      SELECT * FROM tbl_asset_category 
      WHERE is_deleted = 0 
      ORDER BY cid ASC
    `;
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching asset categories:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getSubcategoriesByParentId = async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // If parentId is missing or not a number, return empty array gracefully
    if (!parentId || isNaN(parseInt(parentId, 10))) {
      return res.status(200).json([]);
    }

    const queryText = `
      SELECT * FROM tbl_asset_category 
      WHERE is_deleted = 0 AND parent_id = $1
      ORDER BY cid ASC
    `;
    const result = await db.query(queryText, [parseInt(parentId, 10)]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createAssetCategory = async (req, res) => {
  try {
    const { category_name, parent_id, status } = req.body;
    if (!category_name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const queryText = `
      INSERT INTO tbl_asset_category (category_name, parent_id, status, is_deleted)
      VALUES ($1, $2, $3, 0)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      category_name.trim(),
      parent_id || 0,
      status || 'Active'
    ]);

    res.status(201).json({
      message: 'Category created successfully.',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateAssetCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, parent_id, status } = req.body;

    const queryText = `
      UPDATE tbl_asset_category
      SET category_name = COALESCE($1, category_name),
          parent_id = COALESCE($2, parent_id),
          status = COALESCE($3, status)
      WHERE cid = $4 AND is_deleted = 0
      RETURNING *
    `;
    const result = await db.query(queryText, [
      category_name ? category_name.trim() : null,
      parent_id !== undefined ? parent_id : null,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found or deleted.' });
    }

    res.status(200).json({
      message: 'Category updated successfully.',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteAssetCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_asset_category
      SET is_deleted = 1
      WHERE cid = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
