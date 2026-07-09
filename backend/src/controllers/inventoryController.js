const db = require('../config/db');

exports.getAllInventory = async (req, res) => {
  try {
    const { clientid } = req.query;

    let query = `
      SELECT 
        inv.id,
        inv.asset_id,
        COALESCE(ast.field_data->>'1781609374288', 'Asset #' || inv.asset_id) AS asset_name,
        inv.qty_on_hand,
        inv.qty_reserved,
        inv.reorder_level,
        inv.average_cost,
        inv.status,
        inv.uom_id,
        uom.uom_name AS uom_name,
        inv.clientid,
        inv.country_id,
        inv.created_at,
        inv.updated_at
      FROM tbl_inventory inv
      LEFT JOIN tbl_asset ast ON inv.asset_id = ast.id
      LEFT JOIN tbl_uom uom ON inv.uom_id = uom.id
    `;

    const params = [];
    if (clientid) {
      query += ` WHERE inv.clientid = $1`;
      params.push(clientid);
    }

    query += ` ORDER BY inv.id DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { reorder_level, status } = req.body;

    let updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (reorder_level !== undefined) {
      updateFields.push(`reorder_level = $${paramIndex++}`);
      params.push(parseInt(reorder_level, 10) || 0);
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    const query = `
      UPDATE tbl_inventory
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    // Fetch full record with asset and uom names
    const fullRecordRes = await db.query(`
      SELECT 
        inv.id,
        inv.asset_id,
        COALESCE(ast.field_data->>'1781609374288', 'Asset #' || inv.asset_id) AS asset_name,
        inv.qty_on_hand,
        inv.qty_reserved,
        inv.reorder_level,
        inv.average_cost,
        inv.status,
        inv.uom_id,
        uom.uom_name AS uom_name,
        inv.clientid,
        inv.country_id,
        inv.created_at,
        inv.updated_at
      FROM tbl_inventory inv
      LEFT JOIN tbl_asset ast ON inv.asset_id = ast.id
      LEFT JOIN tbl_uom uom ON inv.uom_id = uom.id
      WHERE inv.id = $1
    `, [id]);

    res.json(fullRecordRes.rows[0]);
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM tbl_inventory WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }
    res.json({ message: 'Inventory record deleted successfully', deletedRecord: result.rows[0] });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getInventoryMovements = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        mov.id,
        mov.inventory_id,
        mov.asset_id,
        mov.movement_type,
        mov.qty,
        mov.barcode,
        mov.reference_table,
        mov.reference_id,
        mov.employee_id,
        mov.user_id,
        mov.notes,
        mov.clientid,
        mov.country_id,
        mov.created_at,
        emp.full_name AS employee_name
      FROM tbl_inventory_movement mov
      LEFT JOIN employee emp ON mov.employee_id = emp.id
      WHERE mov.inventory_id = $1
      ORDER BY mov.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

