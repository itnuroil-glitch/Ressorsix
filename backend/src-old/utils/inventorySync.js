const db = require('../config/db');

const recalculateAssetInventory = async (assetId, clientid, country_id) => {
  if (!assetId) return;
  try {
    const assetRes = await db.query('SELECT field_data FROM tbl_asset WHERE id = $1', [assetId]);
    if (assetRes.rows.length === 0) return;
    const fieldData = assetRes.rows[0].field_data || {};
    const assetName = fieldData['1781609374288'] || '';
    let openingQty = parseFloat(fieldData['1781612001954']) || 0;
    let openingValue = parseFloat(fieldData['1781612056282']) || 0;
    
    let uomId = null;
    const uomVal = fieldData['1782213964984'];
    if (uomVal) {
      const uomValStr = String(uomVal).trim();
      // The asset form stores the UOM ID (numeric), not the name.
      // Try to resolve by ID first, then fall back to name match.
      if (/^\d+$/.test(uomValStr)) {
        const uomRes = await db.query('SELECT id FROM tbl_uom WHERE id = $1 LIMIT 1', [parseInt(uomValStr, 10)]);
        if (uomRes.rows.length > 0) uomId = uomRes.rows[0].id;
      } else {
        const uomRes = await db.query('SELECT id FROM tbl_uom WHERE LOWER(uom_name) = LOWER($1) LIMIT 1', [uomValStr]);
        if (uomRes.rows.length > 0) uomId = uomRes.rows[0].id;
      }
    }

    const purRes = await db.query('SELECT line_items FROM tbl_Purchases WHERE line_items IS NOT NULL');
    let purchasedQty = 0;
    let purchasedCost = 0;
    
    purRes.rows.forEach(row => {
      let items = [];
      try { items = typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items; } catch(e){}
      if(Array.isArray(items)){
        items.forEach(item => {
          if (String(item.item_name).trim().toLowerCase() === String(assetName).trim().toLowerCase()) {
             const q = parseFloat(item.qty) || 0;
             const p = parseFloat(item.unit_price) || 0;
             purchasedQty += q;
             purchasedCost += (q * p);
          }
        });
      }
    });

    const totalQty = openingQty + purchasedQty;
    const totalCost = (openingQty * openingValue) + purchasedCost;
    const averageCost = totalQty > 0 ? (totalCost / totalQty) : 0;

    const resCount = await db.query('SELECT count(*) as count FROM "tbl_asset_opening_stock" WHERE asset_id = $1 AND status != \'Active\' AND is_deleted = false', [assetId]);
    const reservedQty = parseInt(resCount.rows[0].count) || 0;

    const qtyOnHand = Math.max(0, totalQty - reservedQty);

    const existing = await db.query('SELECT id FROM tbl_inventory WHERE asset_id = $1 LIMIT 1', [assetId]);
    if (existing.rows.length > 0) {
      await db.query(`
        UPDATE tbl_inventory SET 
          qty_on_hand = $1, 
          qty_reserved = $2, 
          average_cost = $3, 
          uom_id = COALESCE($4, uom_id), 
          updated_at = NOW() 
        WHERE asset_id = $5
      `, [qtyOnHand, reservedQty, averageCost, uomId, assetId]);
    } else {
      await db.query(`
        INSERT INTO tbl_inventory (asset_id, qty_on_hand, qty_reserved, reorder_level, uom_id, average_cost, status, clientid, country_id)
        VALUES ($1, $2, $3, 5, $4, $5, 'Active', $6, $7)
      `, [assetId, qtyOnHand, reservedQty, uomId, averageCost, clientid, country_id]);
    }
  } catch (err) {
    console.error('Error recalculating inventory:', err);
  }
};

const logInventoryMovement = async ({
  asset_id,
  movement_type,
  qty,
  barcode = null,
  reference_table = null,
  reference_id = null,
  employee_id = null,
  user_id = null,
  notes = null,
  clientid = null,
  country_id = null
}) => {
  try {
    if (!asset_id) return;
    
    // Resolve inventory_id, creating it if it doesn't exist yet
    let inventory_id = null;
    const invRes = await db.query('SELECT id FROM tbl_inventory WHERE asset_id = $1 LIMIT 1', [asset_id]);
    if (invRes.rows.length > 0) {
      inventory_id = invRes.rows[0].id;
    } else {
      await recalculateAssetInventory(asset_id, clientid, country_id);
      const invRes2 = await db.query('SELECT id FROM tbl_inventory WHERE asset_id = $1 LIMIT 1', [asset_id]);
      if (invRes2.rows.length > 0) {
        inventory_id = invRes2.rows[0].id;
      }
    }

    // Insert the movement log
    await db.query(`
      INSERT INTO tbl_inventory_movement (
        inventory_id, asset_id, movement_type, qty, barcode, 
        reference_table, reference_id, employee_id, user_id, notes, 
        clientid, country_id, inventory_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Asset', NOW())
    `, [
      inventory_id, asset_id, movement_type, qty, barcode, 
      reference_table, reference_id, employee_id, user_id, notes, 
      clientid, country_id
    ]);
  } catch (err) {
    console.error('Error logging inventory movement:', err);
  }
};

module.exports = { recalculateAssetInventory, logInventoryMovement };
