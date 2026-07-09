const db = require('../config/db');

exports.getAllAssetBrands = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT * FROM tbl_asset_brand 
      WHERE is_deleted = 0 
    `;
    let params = [];
    if (clientId) {
      queryText += ` AND client_id = $1`;
      params.push(clientId);
    }
    queryText += ` ORDER BY bid ASC`;
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching asset brands:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createAssetBrand = async (req, res) => {
  try {
    const { brand_name, status } = req.body;
    const clientId = req.body.client_id || req.body.clientid;
    if (!brand_name) {
      return res.status(400).json({ message: 'Brand name is required.' });
    }

    const trimmedName = brand_name.trim();

    // Check for duplicate brand scoped to this client
    let checkQuery = `SELECT * FROM tbl_asset_brand WHERE LOWER(brand_name) = LOWER($1) AND is_deleted = 0`;
    let checkParams = [trimmedName];
    if (clientId) {
      checkQuery += ` AND client_id = $2`;
      checkParams.push(clientId);
    } else {
      checkQuery += ` AND client_id IS NULL`;
    }
    const checkResult = await db.query(checkQuery, checkParams);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ message: 'A brand with this name already exists.' });
    }

    const queryText = `
      INSERT INTO tbl_asset_brand (brand_name, status, client_id, is_deleted)
      VALUES ($1, $2, $3, 0)
      RETURNING *
    `;
    const result = await db.query(queryText, [
      trimmedName,
      status || 'Active',
      clientId || null
    ]);

    res.status(201).json({
      message: 'Brand created successfully.',
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateAssetBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { brand_name, status } = req.body;

    let trimmedName = brand_name ? brand_name.trim() : null;

    if (trimmedName) {
      // Get the existing brand to see its client_id
      const currentBrandRes = await db.query('SELECT client_id FROM tbl_asset_brand WHERE bid = $1', [id]);
      const currentClientId = currentBrandRes.rows[0]?.client_id;

      let checkQuery = `SELECT * FROM tbl_asset_brand WHERE LOWER(brand_name) = LOWER($1) AND bid != $2 AND is_deleted = 0`;
      let checkParams = [trimmedName, id];
      if (currentClientId) {
        checkQuery += ` AND client_id = $3`;
        checkParams.push(currentClientId);
      } else {
        checkQuery += ` AND client_id IS NULL`;
      }
      const checkResult = await db.query(checkQuery, checkParams);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: 'A brand with this name already exists.' });
      }
    }

    const queryText = `
      UPDATE tbl_asset_brand
      SET brand_name = COALESCE($1, brand_name),
          status = COALESCE($2, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE bid = $3 AND is_deleted = 0
      RETURNING *
    `;
    const result = await db.query(queryText, [
      trimmedName,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Brand not found or deleted.' });
    }

    res.status(200).json({
      message: 'Brand updated successfully.',
      brand: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteAssetBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const queryText = `
      UPDATE tbl_asset_brand
      SET is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE bid = $1
      RETURNING *
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Brand not found.' });
    }

    res.status(200).json({ message: 'Brand deleted successfully.' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

