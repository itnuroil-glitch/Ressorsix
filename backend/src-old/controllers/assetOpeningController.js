const db = require('../config/db');

// Add opening stock
exports.addAssetOpening = async (req, res) => {
  const { asset_id, opening_qty, prefix = 'AST' } = req.body;

  if (!asset_id || !opening_qty || opening_qty <= 0) {
    return res.status(400).json({ error: 'Asset ID and a valid opening quantity are required' });
  }

  try {
    // Start a transaction since we are inserting multiple rows
    await db.query('BEGIN');

    const insertedRows = [];
    
    for (let i = 0; i < opening_qty; i++) {
      // Generate a unique barcode: Prefix + AssetID + Timestamp + Index
      // Or you can use a UUID or simple sequence
      const barcode = `${prefix}-${asset_id}-${Date.now()}-${i}`;
      const unique_id = require('crypto').randomBytes(4).toString('hex'); // Generates an 8-character short ID
      
      const queryText = `
        INSERT INTO "tbl_asset_opening_stock" (asset_id, opening_qty, "Barcode", unique_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const result = await db.query(queryText, [asset_id, 1, barcode, unique_id]); // Storing qty as 1 per row
      insertedRows.push(result.rows[0]);
    }

    await db.query('COMMIT');

    res.status(201).json({
      message: `${opening_qty} stock items added successfully`,
      data: insertedRows
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error adding asset opening stock:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get opening stock by asset
exports.getAssetOpening = async (req, res) => {
  const { asset_id } = req.params;
  
  try {
    const result = await db.query('SELECT * FROM "tbl_asset_opening_stock" WHERE asset_id = $1 ORDER BY id ASC', [asset_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching asset opening stock:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all available barcodes for dropdown
exports.getAllBarcodes = async (req, res) => {
  try {
    const query = `
      SELECT id, "Barcode" as name, unique_id, asset_id 
      FROM "tbl_asset_opening_stock" 
      WHERE is_deleted = false AND status = 'Active'
      ORDER BY id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching all barcodes:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
