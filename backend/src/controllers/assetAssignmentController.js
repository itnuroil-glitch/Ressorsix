const db = require('../config/db');
const { recalculateAssetInventory, logInventoryMovement } = require('../utils/inventorySync');
const { logAudit } = require('../utils/auditLogger');

// Helper to extract a friendly assignment title (e.g. "HP mouse 34 (Ana Loren Jimenez)")
const extractAssignmentTitle = async (fieldData, id, assetId = null) => {
  let assetName = '';
  let employeeName = '';

  if (fieldData) {
    let parsed = typeof fieldData === 'string' ? JSON.parse(fieldData) : fieldData;
    if (parsed && typeof parsed === 'object') {
      // 1. Try to find asset name from assetItems
      if (parsed.assetItems && Array.isArray(parsed.assetItems) && parsed.assetItems.length > 0) {
        const itemNames = [];
        for (const item of parsed.assetItems) {
          if (item.asset_name) {
            itemNames.push(item.asset_name);
          } else if (item.asset_id) {
            try {
              const aRes = await db.query('SELECT field_data FROM tbl_asset WHERE id = $1', [item.asset_id]);
              if (aRes.rows.length > 0) {
                let aFd = aRes.rows[0].field_data;
                if (typeof aFd === 'string') try { aFd = JSON.parse(aFd); } catch(e){}
                const name = aFd?.['1781609374288'] || aFd?.asset_name || Object.values(aFd || {})[0];
                if (name) itemNames.push(String(name));
              }
            } catch(e){}
          }
        }
        if (itemNames.length > 0) assetName = itemNames.join(', ');
      }

      // 2. Try single asset_id if assetItems didn't give name
      if (!assetName && (parsed.asset_id || assetId)) {
        try {
          const aRes = await db.query('SELECT field_data FROM tbl_asset WHERE id = $1', [parsed.asset_id || assetId]);
          if (aRes.rows.length > 0) {
            let aFd = aRes.rows[0].field_data;
            if (typeof aFd === 'string') try { aFd = JSON.parse(aFd); } catch(e){}
            const name = aFd?.['1781609374288'] || aFd?.asset_name || Object.values(aFd || {})[0];
            if (name) assetName = String(name);
          }
        } catch(e){}
      }

      // 3. Try to resolve employee name
      for (const [key, value] of Object.entries(parsed)) {
        if (key !== 'assetItems' && value && typeof value === 'string' && value.length > 0 && value.length < 50 && !key.toLowerCase().includes('date') && !value.includes('-')) {
          try {
            const empRes = await db.query('SELECT full_name, name FROM employee WHERE id::text = $1', [value]);
            if (empRes.rows.length > 0) {
              employeeName = empRes.rows[0].full_name || empRes.rows[0].name || '';
              break;
            }
          } catch(e){}
        }
      }
    }
  }

  if (assetName && employeeName) {
    return `${assetName} (${employeeName})`;
  } else if (assetName) {
    return assetName;
  } else if (employeeName) {
    return `Assignment to ${employeeName}`;
  }
  return `Assignment #${id}`;
};

// Helper to update stock status
const updateStockStatus = async (assetItems, status) => {
  if (!assetItems || !Array.isArray(assetItems)) return;
  for (const item of assetItems) {
    const barcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
    for (const barcode of barcodes) {
      if (barcode) {
        await db.query(
          'UPDATE "tbl_asset_opening_stock" SET status = $1 WHERE "Barcode" = $2',
          [status, barcode]
        );
      }
    }
  }
};

const logAssetAction = async (assignment_id, assetItems, action_type, clientid, field_data) => {
  if (!assetItems || !Array.isArray(assetItems)) return;
  
  let employee_id = null;
  if (field_data) {
    for (const [key, value] of Object.entries(field_data)) {
      if (key !== 'assetItems' && typeof value === 'string' && value.length < 50) {
        employee_id = value;
        break;
      }
    }
  }

  for (const item of assetItems) {
    const barcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
    for (const barcode of barcodes) {
      if (barcode) {
        await db.query(
          'INSERT INTO tbl_asset_log (assignment_id, asset_id, barcode, employee_id, action_type, action_date, clientid) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6)',
          [assignment_id, item.asset_id, barcode, employee_id, action_type, clientid]
        );
      }
    }
  }
};

exports.saveAssetAssignment = async (req, res) => {
  try {
    const { asset_id, custom_field_id, field_data, clientid, country_id, moduleid, company_id } = req.body;
    
    // Save to tbl_asset_assigned
    const jsonData = JSON.stringify(field_data);
    const query = `
      INSERT INTO tbl_asset_assigned (asset_id, custom_field_id, field_data, clientid, country_id, moduleid, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const values = [asset_id, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, company_id || null];
    const result = await db.query(query, values);

    // Update stock to 'Assigned' and log it
    if (field_data && field_data.assetItems) {
      await updateStockStatus(field_data.assetItems, 'Assigned');
      await logAssetAction(result.rows[0].id, field_data.assetItems, 'Assigned', clientid, field_data);

      let employee_id = null;
      if (field_data) {
        for (const [key, value] of Object.entries(field_data)) {
          if (key !== 'assetItems' && typeof value === 'string' && value.length < 50) {
            employee_id = value;
            break;
          }
        }
      }

      // Log movement to tbl_inventory_movement
      for (const item of field_data.assetItems) {
        const barcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
        for (const barcode of barcodes) {
          if (barcode) {
            await logInventoryMovement({
              asset_id: item.asset_id,
              movement_type: 'ASSIGNMENT OUT',
              qty: -1, // negative for assignment
              barcode,
              reference_table: 'tbl_asset_assigned',
              reference_id: result.rows[0].id,
              employee_id: employee_id,
              notes: `Asset assigned to employee`,
              clientid: clientid || null,
              country_id: country_id || null
            });
          }
        }
      }

      // Recalculate inventory for all affected asset IDs
      const assetIds = [...new Set(field_data.assetItems.map(item => item.asset_id).filter(Boolean))];
      for (const aid of assetIds) {
        await recalculateAssetInventory(aid, clientid, country_id);
      }
    }
    if (asset_id) {
      await recalculateAssetInventory(asset_id, clientid, country_id);
    }

    // Log Creation Audit
    try {
      const aTitle = await extractAssignmentTitle(field_data, result.rows[0].id, asset_id);
      logAudit({
        req,
        clientid: clientid || result.rows[0].clientid,
        company_id: company_id || result.rows[0].company_id,
        module_name: 'ASSET_ASSIGNMENT',
        record_id: result.rows[0].id,
        record_title: aTitle,
        action_type: 'CREATE',
        action_summary: `Created asset assignment: ${aTitle}`,
        new_data: field_data
      }).catch(e => console.error('[AUDIT] Failed to log asset assignment creation:', e.message));
    } catch (e) {
      console.error('[AUDIT] Error preparing asset assignment create log:', e.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving asset assignment:', error);
    res.status(500).json({ message: 'Error saving asset assignment' });
  }
};

exports.getAssetAssignments = async (req, res) => {
  try {
    const { clientid, email } = req.query;
    let query = `
      SELECT a.*, 
        COALESCE(
          (
            SELECT string_agg(comp_sub.company_name, ', ')
            FROM company comp_sub
            WHERE comp_sub.id::text = ANY(string_to_array(a.company_id::text, ','))
              AND (comp_sub.is_deleted = false OR comp_sub.is_deleted IS NULL)
          ),
          c.company_name,
          (
            SELECT comp_client.company_name
            FROM company comp_client
            WHERE comp_client.clientid::text = a.clientid::text
              AND (comp_client.is_deleted = false OR comp_client.is_deleted IS NULL)
            ORDER BY comp_client.id ASC
            LIMIT 1
          )
        ) AS company_name
      FROM tbl_asset_assigned a
      LEFT JOIN company c ON a.company_id::text = c.id::text AND (c.is_deleted = false OR c.is_deleted IS NULL)
      WHERE a.is_deleted = false
    `;
    const params = [];
    let paramCount = 1;

    if (clientid) {
      query += ` AND a.clientid = $${paramCount++}`;
      params.push(clientid);
    }

    let restrictToEmployeeId = null;

    if (email && email.trim() !== '') {
      // 1. Resolve employee details and role
      const empRes = await db.query(
        'SELECT id, roleid FROM employee WHERE email = $1 AND is_deleted = false',
        [email.trim().toLowerCase()]
      );

      if (empRes.rows.length > 0) {
        const employeeId = empRes.rows[0].id;
        const roleId = empRes.rows[0].roleid;

        // Superadmin (role 1) and Client Admin (role 2) bypass restriction automatically
        if (String(roleId) !== '1' && String(roleId) !== '2') {
          // 2. Fetch the Asset Assignment module ID to check permissions
          const moduleRes = await db.query(
            "SELECT id FROM module WHERE LOWER(module_name) LIKE '%asset assignment%' LIMIT 1"
          );

          if (moduleRes.rows.length > 0) {
            const moduleId = moduleRes.rows[0].id;

            // 3. Query role permissions table for the all_record_view flag
            const permRes = await db.query(
              'SELECT all_record_view FROM role_permission WHERE role_id = $1 AND module_id = $2',
              [roleId, moduleId]
            );

            const hasAllRecordView = permRes.rows.length > 0 && permRes.rows[0].all_record_view === true;

            // If the role DOES NOT have All Record View checked, restrict assignments to this employee
            if (!hasAllRecordView) {
              restrictToEmployeeId = String(employeeId);
            }
          } else {
            // Fallback: Default restrict if module metadata isn't found
            restrictToEmployeeId = String(employeeId);
          }
        }
      }
    }

    // 4. Apply dynamic JSON filtering if restrictToEmployeeId is set
    if (restrictToEmployeeId) {
      query += ` AND EXISTS (
        SELECT 1 FROM jsonb_each_text(field_data::jsonb)
        WHERE value = $${paramCount++}
      )`;
      params.push(restrictToEmployeeId);
    }

    query += ' ORDER BY a.id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching asset assignments:', error);
    res.status(500).json({ message: 'Error fetching asset assignments' });
  }
};

exports.updateAssetAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { asset_id, custom_field_id, field_data, clientid, country_id, moduleid, company_id } = req.body;

    // Get old record to free up old barcodes
    const oldRecord = await db.query('SELECT asset_id, clientid, country_id, company_id, field_data FROM tbl_asset_assigned WHERE id = $1', [id]);
    if (oldRecord.rows.length === 0) return res.status(404).json({ message: 'Not found' });

    const oldAssetId = oldRecord.rows[0].asset_id;
    const oldClientid = oldRecord.rows[0].clientid;
    const oldCountryId = oldRecord.rows[0].country_id;
    const oldFieldData = typeof oldRecord.rows[0].field_data === 'string' ? JSON.parse(oldRecord.rows[0].field_data) : oldRecord.rows[0].field_data;
    let oldEmployeeId = null;
    if (oldFieldData) {
      for (const [key, value] of Object.entries(oldFieldData)) {
        if (key !== 'assetItems' && typeof value === 'string' && value.length < 50) {
          oldEmployeeId = value;
          break;
        }
      }
    }

    if (oldFieldData && oldFieldData.assetItems) {
      await updateStockStatus(oldFieldData.assetItems, 'Active');
      await logAssetAction(id, oldFieldData.assetItems, 'Returned', clientid || oldClientid, oldFieldData);

      // Log movement as RETURN (positive qty)
      for (const item of oldFieldData.assetItems) {
        const barcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
        for (const barcode of barcodes) {
          if (barcode) {
            await logInventoryMovement({
              asset_id: item.asset_id,
              movement_type: 'ASSIGNED IN',
              qty: 1, // positive for return
              barcode,
              reference_table: 'tbl_asset_assigned',
              reference_id: id,
              employee_id: oldEmployeeId,
              notes: `Asset returned to stock (updated assignment)`,
              clientid: clientid || oldClientid,
              country_id: country_id || oldCountryId
            });
          }
        }
      }
    }

    const jsonData = JSON.stringify(field_data);
    const query = `
      UPDATE tbl_asset_assigned
      SET asset_id = $1, custom_field_id = $2, field_data = $3, clientid = $4, country_id = $5, moduleid = $6, company_id = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    const values = [asset_id, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, company_id || null, id];
    const result = await db.query(query, values);

    // Update stock to 'Assigned' for new barcodes and log it
    if (field_data && field_data.assetItems) {
      await updateStockStatus(field_data.assetItems, 'Assigned');
      await logAssetAction(id, field_data.assetItems, 'Assigned', clientid || oldClientid, field_data);

      let newEmployeeId = null;
      if (field_data) {
        for (const [key, value] of Object.entries(field_data)) {
          if (key !== 'assetItems' && typeof value === 'string' && value.length < 50) {
            newEmployeeId = value;
            break;
          }
        }
      }

      // Log movement as ASSIGNMENT OUT (negative qty)
      for (const item of field_data.assetItems) {
        const barcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
        for (const barcode of barcodes) {
          if (barcode) {
            await logInventoryMovement({
              asset_id: item.asset_id,
              movement_type: 'ASSIGNMENT OUT',
              qty: -1, // negative for assignment
              barcode,
              reference_table: 'tbl_asset_assigned',
              reference_id: id,
              employee_id: newEmployeeId,
              notes: `Asset assigned to employee (updated assignment)`,
              clientid: clientid || oldClientid,
              country_id: country_id || oldCountryId
            });
          }
        }
      }
    }

    // Recalculate inventory for all affected asset IDs
    const assetIdsToRecalc = new Set();
    if (oldAssetId) assetIdsToRecalc.add(oldAssetId);
    if (asset_id) assetIdsToRecalc.add(asset_id);
    if (oldFieldData && oldFieldData.assetItems) {
      oldFieldData.assetItems.forEach(item => {
        if (item.asset_id) assetIdsToRecalc.add(item.asset_id);
      });
    }
    if (field_data && field_data.assetItems) {
      field_data.assetItems.forEach(item => {
        if (item.asset_id) assetIdsToRecalc.add(item.asset_id);
      });
    }

    for (const aid of assetIdsToRecalc) {
      await recalculateAssetInventory(aid, clientid || oldClientid, country_id || oldCountryId);
    }

    // Log Update Audit
    try {
      const aTitle = await extractAssignmentTitle(field_data, id, asset_id);
      logAudit({
        req,
        clientid: clientid || oldClientid,
        company_id: company_id || oldRecord.rows[0].company_id,
        module_name: 'ASSET_ASSIGNMENT',
        record_id: id,
        record_title: aTitle,
        action_type: 'UPDATE',
        action_summary: `Updated asset assignment for ${aTitle}`,
        old_data: oldFieldData,
        new_data: field_data
      }).catch(e => console.error('[AUDIT] Failed to log asset assignment update:', e.message));
    } catch (e) {
      console.error('[AUDIT] Error preparing asset assignment update log:', e.message);
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating asset assignment:', error);
    res.status(500).json({ message: 'Error updating asset assignment' });
  }
};

exports.deleteAssetAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const oldRecord = await db.query('SELECT asset_id, clientid, country_id, company_id, field_data FROM tbl_asset_assigned WHERE id = $1', [id]);
    if (oldRecord.rows.length === 0) return res.status(404).json({ message: 'Not found' });

    const oldAssetId = oldRecord.rows[0].asset_id;
    const oldClientid = oldRecord.rows[0].clientid;
    const oldCountryId = oldRecord.rows[0].country_id;
    const oldCompanyId = oldRecord.rows[0].company_id;
    const oldFieldData = typeof oldRecord.rows[0].field_data === 'string' ? JSON.parse(oldRecord.rows[0].field_data) : oldRecord.rows[0].field_data;
    
    let oldEmployeeId = null;
    if (oldFieldData) {
      for (const [key, value] of Object.entries(oldFieldData)) {
        if (key !== 'assetItems' && typeof value === 'string' && value.length < 50) {
          oldEmployeeId = value;
          break;
        }
      }
    }

    if (oldFieldData && oldFieldData.assetItems) {
      await updateStockStatus(oldFieldData.assetItems, 'Active');
      await logAssetAction(id, oldFieldData.assetItems, 'Returned/Deleted', oldClientid, oldFieldData);

      // Log movement as RETURN (positive qty)
      for (const item of oldFieldData.assetItems) {
        const barcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
        for (const barcode of barcodes) {
          if (barcode) {
            await logInventoryMovement({
              asset_id: item.asset_id,
              movement_type: 'ASSIGNED IN',
              qty: 1, // positive for return
              barcode,
              reference_table: 'tbl_asset_assigned',
              reference_id: id,
              employee_id: oldEmployeeId,
              notes: `Asset returned to stock (assignment deleted)`,
              clientid: oldClientid,
              country_id: oldCountryId
            });
          }
        }
      }
    }

    // Log Delete Audit
    try {
      const aTitle = await extractAssignmentTitle(oldFieldData, id, oldAssetId);
      logAudit({
        req,
        clientid: oldClientid,
        company_id: oldCompanyId,
        module_name: 'ASSET_ASSIGNMENT',
        record_id: id,
        record_title: aTitle,
        action_type: 'DELETE',
        action_summary: `Deleted asset assignment for ${aTitle}`,
        old_data: oldFieldData,
        new_data: null
      }).catch(e => console.error('[AUDIT] Failed to log asset assignment deletion:', e.message));
    } catch (e) {
      console.error('[AUDIT] Error preparing asset assignment delete log:', e.message);
    }

    await db.query('DELETE FROM tbl_asset_assigned WHERE id = $1', [id]);

    // Recalculate inventory for all affected asset IDs
    const assetIdsToRecalc = new Set();
    if (oldAssetId) assetIdsToRecalc.add(oldAssetId);
    if (oldFieldData && oldFieldData.assetItems) {
      oldFieldData.assetItems.forEach(item => {
        if (item.asset_id) assetIdsToRecalc.add(item.asset_id);
      });
    }

    for (const aid of assetIdsToRecalc) {
      await recalculateAssetInventory(aid, oldClientid, oldCountryId);
    }

    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset assignment:', error);
    res.status(500).json({ message: 'Error deleting asset assignment' });
  }
};
