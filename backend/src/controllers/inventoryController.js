const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

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

    const prevRes = await db.query(`
      SELECT 
        inv.*,
        COALESCE(ast.field_data->>'1781609374288', 'Asset #' || inv.asset_id) AS asset_name
      FROM tbl_inventory inv
      LEFT JOIN tbl_asset ast ON inv.asset_id = ast.id
      WHERE inv.id = $1
    `, [id]);

    if (prevRes.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }
    const oldRecord = prevRes.rows[0];

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

    const newRecord = fullRecordRes.rows[0];

    try {
      await logAudit({
        req,
        clientid: newRecord.clientid,
        module_name: 'INVENTORY',
        record_id: id,
        record_title: newRecord.asset_name,
        action_type: 'UPDATE',
        action_summary: `Updated inventory settings for ${newRecord.asset_name}`,
        old_data: {
          reorder_level: oldRecord.reorder_level,
          status: oldRecord.status
        },
        new_data: {
          reorder_level: newRecord.reorder_level,
          status: newRecord.status
        }
      });
    } catch (auditErr) {
      console.error('[AUDIT] Failed to log inventory update:', auditErr.message);
    }

    res.json(newRecord);
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const prevRes = await db.query(`
      SELECT 
        inv.*,
        COALESCE(ast.field_data->>'1781609374288', 'Asset #' || inv.asset_id) AS asset_name
      FROM tbl_inventory inv
      LEFT JOIN tbl_asset ast ON inv.asset_id = ast.id
      WHERE inv.id = $1
    `, [id]);
    const oldRecord = prevRes.rows[0];

    const result = await db.query('DELETE FROM tbl_inventory WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    if (oldRecord) {
      try {
        await logAudit({
          req,
          clientid: oldRecord.clientid,
          module_name: 'INVENTORY',
          record_id: id,
          record_title: oldRecord.asset_name,
          action_type: 'DELETE',
          action_summary: `Deleted inventory record for ${oldRecord.asset_name}`,
          old_data: {
            asset_name: oldRecord.asset_name,
            qty_on_hand: oldRecord.qty_on_hand,
            qty_reserved: oldRecord.qty_reserved,
            average_cost: oldRecord.average_cost,
            reorder_level: oldRecord.reorder_level,
            status: oldRecord.status
          }
        });
      } catch (auditErr) {
        console.error('[AUDIT] Failed to log inventory deletion:', auditErr.message);
      }
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

