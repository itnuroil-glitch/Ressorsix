const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { recalculateAssetInventory, logInventoryMovement } = require('../utils/inventorySync');

const resolveSupplierIdByName = async (supplierName) => {
  if (!supplierName || typeof supplierName !== 'string') return null;
  try {
    const res = await db.query(
      `SELECT id FROM tbl_suppliers 
       WHERE EXISTS (
         SELECT 1 FROM jsonb_each_text(field_data) x WHERE LOWER(TRIM(x.value)) = LOWER(TRIM($1))
       ) AND (isdelete = false OR isdelete IS NULL) LIMIT 1`,
      [supplierName]
    );
    if (res.rows.length > 0) {
      return res.rows[0].id;
    }
  } catch (err) {
    console.error('Error resolving supplier_id by name:', err);
  }
  return null;
};

const resolveExpireDate = async (currentFieldId, fieldData) => {
  if (!currentFieldId || !fieldData) return null;
  try {
    const fileFieldRes = await db.query(
      'SELECT custom_fieldsid, section_id, parent_fieldid FROM tbl_customfield_details WHERE field_id = $1 LIMIT 1',
      [currentFieldId]
    );
    if (fileFieldRes.rows.length === 0) return null;
    const { custom_fieldsid, section_id, parent_fieldid } = fileFieldRes.rows[0];

    let dateFieldsRes;
    if (parent_fieldid) {
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND parent_fieldid = $2 AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [custom_fieldsid, parent_fieldid]
      );
    } else {
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND section_id = $2 AND parent_fieldid IS NULL AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [custom_fieldsid, section_id]
      );
    }

    if (dateFieldsRes.rows.length === 0) {
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND section_id = $2 AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [custom_fieldsid, section_id]
      );
    }

    if (dateFieldsRes.rows.length === 0) return null;

    let bestCandidate = dateFieldsRes.rows.find(row => {
      const name = row.field_name.toLowerCase();
      return name.includes('expire') || name.includes('expiry') || name.includes('end');
    });

    if (!bestCandidate) {
      bestCandidate = dateFieldsRes.rows[0];
    }

    if (bestCandidate && fieldData[bestCandidate.field_id]) {
      const dateStr = String(fieldData[bestCandidate.field_id]).split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
    }
  } catch (err) {
    console.error('Error resolving expire_date for attachment:', err);
  }
  return null;
};

const saveAttachmentLocally = (base64String, fileName) => {
  if (!base64String) return null;
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let buffer;
  if (matches && matches.length === 3) {
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64String, 'base64');
  }

  const attachmentDir = path.join(__dirname, '../../Attachment');
  if (!fs.existsSync(attachmentDir)) {
    fs.mkdirSync(attachmentDir, { recursive: true });
  }

  const uniqueName = Date.now() + '-' + (fileName ? fileName.replace(/\s+/g, '_') : 'attachment.file');
  const filePath = path.join(attachmentDir, uniqueName);

  fs.writeFileSync(filePath, buffer);
  return `/backend/Attachment/${uniqueName}`;
};

const extractFilePaths = (val) => {
  const paths = [];
  const traverse = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      v.forEach(traverse);
      return;
    }
    if (v.data && typeof v.data === 'string' && (v.data.startsWith('/') || v.data.startsWith('http'))) {
      paths.push(v.data);
    }
    Object.values(v).forEach(traverse);
  };
  traverse(val);
  return paths;
};

const processAndSyncFieldDataFiles = async (fieldData, clientid) => {
  if (!fieldData || typeof fieldData !== 'object') {
    return fieldData;
  }

  let companyid = null;
  if (clientid) {
    try {
      const companyRes = await db.query(
        'SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id ASC LIMIT 1',
        [clientid]
      );
      if (companyRes.rows.length > 0) {
        companyid = companyRes.rows[0].id;
      }
    } catch (e) {
      console.error('Error fetching company for client:', e);
    }
  }

  const traverse = async (val, currentFieldId = null) => {
    if (!val || typeof val !== 'object') {
      return val;
    }

    if (Array.isArray(val)) {
      const results = [];
      for (const item of val) {
        results.push(await traverse(item, currentFieldId));
      }
      return results;
    }

    if (val.data && typeof val.data === 'string' && val.data.startsWith('data:')) {
      const savedPath = saveAttachmentLocally(val.data, val.name);
      if (savedPath) {
        let attachmentType = 'Purchase Attachment';
        if (currentFieldId) {
          try {
            const fieldRes = await db.query(
              'SELECT field_name FROM tbl_customfield_details WHERE field_id = $1 LIMIT 1',
              [currentFieldId]
            );
            if (fieldRes.rows.length > 0) {
              attachmentType = fieldRes.rows[0].field_name;
            }
          } catch (e) {
            console.error('Error fetching field details:', e);
          }
        }

        let expireDate = null;
        if (currentFieldId) {
          expireDate = await resolveExpireDate(currentFieldId, fieldData);
        }

        try {
          const insertQuery = `
            INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 1, false, NOW(), NOW())
          `;
          await db.query(insertQuery, [clientid || null, companyid, savedPath, attachmentType, expireDate]);
        } catch (e) {
          console.error('Error inserting into attachment table:', e);
        }

        return {
          ...val,
          data: savedPath
        };
      }
    }

    const processed = {};
    for (const key of Object.keys(val)) {
      processed[key] = await traverse(val[key], currentFieldId || key);
    }
    return processed;
  };

  return await traverse(fieldData);
};

exports.getAllPurchases = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        p.*, 
        (
          SELECT string_agg(company_name, ', ') 
          FROM company 
          WHERE id = ANY(string_to_array(nullif(p.company_id, ''), ',')::integer[])
        ) AS company_name,
        (SELECT string_agg(role, ', ') FROM role WHERE id = ANY(string_to_array(p.roleid::text, ',')::int[])) AS role_name, 
        COALESCE(
          e.full_name, 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid = p.roleid::text AND e_fallback.clientid = p.clientid LIMIT 1)
        ) AS employee_name
      FROM tbl_Purchases p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN employee e ON u.email = e.email
    `;
    let params = [];
    if (clientid) {
      query += ' WHERE p.clientid = $1';
      params.push(clientid);
    }
    query += ' ORDER BY p.id DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resolveAssetIdByName = async (assetName) => {
  if (!assetName || typeof assetName !== 'string') return null;
  try {
    const res = await db.query(
      `SELECT id FROM tbl_asset 
       WHERE LOWER(TRIM(field_data->>'1781609374288')) = LOWER(TRIM($1)) LIMIT 1`,
      [assetName]
    );
    if (res.rows.length > 0) {
      return res.rows[0].id;
    }
  } catch (err) {
    console.error('Error resolving asset_id by name:', err);
  }
  return null;
};

const syncPurchaseBarcodes = async (purchaseId, lineItems) => {
  let parsedLineItems = lineItems;
  if (typeof lineItems === 'string') {
    try {
      parsedLineItems = JSON.parse(lineItems);
    } catch (e) {
      console.error('Error parsing line items JSON:', e);
      return;
    }
  }
  if (!parsedLineItems || !Array.isArray(parsedLineItems)) return;

  // 1. Resolve all asset IDs for the incoming line items
  const incomingAssets = [];
  for (const item of parsedLineItems) {
    const assetId = await resolveAssetIdByName(item.item_name);
    const qty = parseInt(item.qty, 10) || 0;
    const serialNumbers = Array.isArray(item.serial_numbers) ? item.serial_numbers : [];
    if (assetId && qty > 0) {
      incomingAssets.push({ assetId, qty, serialNumbers });
    }
  }

  // 2. Fetch all existing barcodes for this purchase
  const existingBarcodesRes = await db.query(
    'SELECT id, asset_id, status FROM "tbl_asset_opening_stock" WHERE purchase_id = $1 AND is_deleted = false',
    [purchaseId]
  );
  const existingBarcodes = existingBarcodesRes.rows;

  // Group existing barcodes by asset_id
  const existingByAsset = {};
  existingBarcodes.forEach(b => {
    if (!existingByAsset[b.asset_id]) {
      existingByAsset[b.asset_id] = [];
    }
    existingByAsset[b.asset_id].push(b);
  });

  // 3. For each incoming asset, adjust the barcodes
  const activeAssetIds = new Set();
  for (const item of incomingAssets) {
    const { assetId, qty, serialNumbers } = item;
    activeAssetIds.add(assetId);

    // Sort existing barcodes by ID so they align with UI indices
    const barcodesForAsset = (existingByAsset[assetId] || []).sort((a, b) => a.id - b.id);
    const currentCount = barcodesForAsset.length;

    // Loop through the new quantity
    for (let idx = 0; idx < qty; idx++) {
      const sNo = serialNumbers[idx] || null;

      if (idx < currentCount) {
        // Existing barcode: update its serial_number
        const existingBarcode = barcodesForAsset[idx];
        await db.query(
          `UPDATE "tbl_asset_opening_stock" 
           SET serial_number = $1 
           WHERE id = $2`,
          [sNo, existingBarcode.id]
        );
      } else {
        // New barcode: insert it with the serial_number
        const barcode = `PUR-${purchaseId}-${assetId}-${Date.now()}-${idx}`;
        const unique_id = require('crypto').randomBytes(4).toString('hex');
        await db.query(
          `INSERT INTO "tbl_asset_opening_stock" (asset_id, opening_qty, "Barcode", unique_id, status, purchase_id, serial_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [assetId, 1, barcode, unique_id, 'Active', purchaseId, sNo]
        );
      }
    }

    // If quantity is less than existing barcodes, delete the excess ones
    if (qty < currentCount) {
      const toRemoveCount = currentCount - qty;
      // Filter unassigned barcodes to delete first
      const activeBarcodes = barcodesForAsset.filter(b => b.status === 'Active');

      const countToDelete = Math.min(toRemoveCount, activeBarcodes.length);
      for (let i = 0; i < countToDelete; i++) {
        await db.query(
          'DELETE FROM "tbl_asset_opening_stock" WHERE id = $1',
          [activeBarcodes[i].id]
        );
      }
    }
  }

  // 4. Remove all barcodes for assets that are no longer in the purchase list (only delete 'Active' ones)
  const existingAssetIds = Object.keys(existingByAsset).map(Number);
  for (const assetId of existingAssetIds) {
    if (!activeAssetIds.has(assetId)) {
      await db.query(
        `DELETE FROM "tbl_asset_opening_stock" 
         WHERE purchase_id = $1 AND asset_id = $2 AND status = 'Active'`,
        [purchaseId, assetId]
      );
    }
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const { custom_field_id, field_data, line_items, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid);

    let supplier_id = null;
    if (processedFieldData) {
      const supplierVal = processedFieldData["1781960133708"] || Object.values(processedFieldData)[0];
      if (supplierVal && typeof supplierVal === 'string') {
        const match = supplierVal.match(/^(\d+)\s*-\s*/);
        if (match) {
          supplier_id = parseInt(match[1], 10);
        } else {
          supplier_id = await resolveSupplierIdByName(supplierVal);
        }
      }
    }

    const result = await db.query(
      `INSERT INTO tbl_Purchases (custom_field_id, field_data, line_items, clientid, country_id, moduleid, roleid, user_id, supplier_id, company_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        custom_field_id,
        processedFieldData ? JSON.stringify(processedFieldData) : null,
        line_items ? JSON.stringify(line_items) : null,
        clientid,
        country_id,
        moduleid,
        roleid,
        user_id,
        supplier_id,
        company_id || null
      ]
    );

    const newPurchase = result.rows[0];
    // Sync barcodes
    await syncPurchaseBarcodes(newPurchase.id, line_items);

    let parsedForSync = line_items;
    try { if (typeof line_items === 'string') parsedForSync = JSON.parse(line_items); } catch (e) { }
    if (Array.isArray(parsedForSync)) {
      for (const item of parsedForSync) {
        const assetId = await resolveAssetIdByName(item.item_name);
        if (assetId) {
          await recalculateAssetInventory(assetId, clientid, country_id);
          // Log movement to tbl_inventory_movement
          await logInventoryMovement({
            asset_id: assetId,
            movement_type: 'PURCHASE',
            qty: parseInt(item.qty, 10) || 0,
            reference_table: 'tbl_Purchases',
            reference_id: newPurchase.id,
            user_id,
            notes: `Purchased ${item.qty} units via Purchase Order #${newPurchase.id}`,
            clientid,
            country_id
          });
        }
      }
    }

    res.status(201).json(newPurchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, line_items, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;

    // Backend validation: check if new quantities are less than already assigned
    let incomingItems = line_items;
    if (typeof line_items === 'string') {
      try { incomingItems = JSON.parse(line_items); } catch (e) { }
    }
    
    if (Array.isArray(incomingItems)) {
      const assignedRes = await db.query(
        `SELECT asset_id, COUNT(*) as assigned_count 
         FROM "tbl_asset_opening_stock" 
         WHERE purchase_id = $1 AND status = 'Assigned' AND is_deleted = false
         GROUP BY asset_id`,
        [id]
      );
      
      for (const row of assignedRes.rows) {
        const assetRes = await db.query(
          `SELECT field_data->>'1781609374288' as name FROM tbl_asset WHERE id = $1`,
          [row.asset_id]
        );
        if (assetRes.rows.length > 0) {
          const itemName = assetRes.rows[0].name;
          const assignedQty = parseInt(row.assigned_count, 10);
          
          // Find matching incoming item
          const matchedItem = incomingItems.find(item => 
            item.item_name && String(item.item_name).trim().toLowerCase() === String(itemName).trim().toLowerCase()
          );
          
          const newQty = matchedItem ? (parseInt(matchedItem.qty, 10) || 0) : 0;
          if (newQty < assignedQty) {
            return res.status(400).json({ 
              error: `Quantity cannot be less than already assigned quantity. Already assigned: ${assignedQty}.` 
            });
          }
        }
      }
    }

    const selectQuery = 'SELECT field_data FROM tbl_Purchases WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    let oldPaths = [];
    if (selectResult.rowCount > 0) {
      const oldFieldData = selectResult.rows[0].field_data;
      oldPaths = extractFilePaths(oldFieldData);
    }

    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid);
    const newPaths = extractFilePaths(processedFieldData);

    const removedPaths = oldPaths.filter(path => !newPaths.includes(path));
    for (const path of removedPaths) {
      try {
        await db.query(
          'UPDATE attachment SET is_deleted = true, updated_at = NOW() WHERE attachment = $1',
          [path]
        );
      } catch (e) {
        console.error('Error updating attachment table on replacement:', e);
      }
    }

    const result = await db.query(
      `UPDATE tbl_Purchases 
       SET custom_field_id = $1, field_data = $2, line_items = $3, clientid = $4, country_id = $5, moduleid = $6, roleid = $7, user_id = $8, supplier_id = $9, company_id = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [
        custom_field_id,
        processedFieldData ? JSON.stringify(processedFieldData) : null,
        line_items ? JSON.stringify(line_items) : null,
        clientid,
        country_id,
        moduleid,
        roleid,
        user_id,
        await (async () => {
          let supplier_id = null;
          if (processedFieldData) {
            const supplierVal = processedFieldData["1781960133708"] || Object.values(processedFieldData)[0];
            if (supplierVal && typeof supplierVal === 'string') {
              const match = supplierVal.match(/^(\d+)\s*-\s*/);
              if (match) {
                supplier_id = parseInt(match[1], 10);
              } else {
                supplier_id = await resolveSupplierIdByName(supplierVal);
              }
            }
          }
          return supplier_id;
        })(),
        company_id || null,
        id
      ]
    );

    const updatedPurchase = result.rows[0];
    // Sync barcodes
    await syncPurchaseBarcodes(updatedPurchase.id, line_items);

    // Delete old movements for this purchase before recreating
    await db.query("DELETE FROM tbl_inventory_movement WHERE reference_table = 'tbl_Purchases' AND reference_id = $1", [id]);

    let parsedForSync = line_items;
    try { if (typeof line_items === 'string') parsedForSync = JSON.parse(line_items); } catch (e) { }
    if (Array.isArray(parsedForSync)) {
      for (const item of parsedForSync) {
        const assetId = await resolveAssetIdByName(item.item_name);
        if (assetId) {
          await recalculateAssetInventory(assetId, clientid, country_id);
          // Log movement to tbl_inventory_movement
          await logInventoryMovement({
            asset_id: assetId,
            movement_type: 'PURCHASE',
            qty: parseInt(item.qty, 10) || 0,
            reference_table: 'tbl_Purchases',
            reference_id: id,
            user_id,
            notes: `Purchased ${item.qty} units via Purchase Order #${id} (Updated)`,
            clientid,
            country_id
          });
        }
      }
    }

    res.json(updatedPurchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const selectQuery = 'SELECT field_data, line_items, clientid, country_id FROM tbl_Purchases WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    let parsedForSync = null;
    let clientIdVal = null;
    let countryIdVal = null;

    if (selectResult.rowCount > 0) {
      const oldFieldData = selectResult.rows[0].field_data;
      clientIdVal = selectResult.rows[0].clientid;
      countryIdVal = selectResult.rows[0].country_id;
      try { parsedForSync = typeof selectResult.rows[0].line_items === 'string' ? JSON.parse(selectResult.rows[0].line_items) : selectResult.rows[0].line_items; } catch (e) { }
      const oldPaths = extractFilePaths(oldFieldData);
      for (const path of oldPaths) {
        try {
          await db.query(
            'UPDATE attachment SET is_deleted = true, updated_at = NOW() WHERE attachment = $1',
            [path]
          );
        } catch (e) {
          console.error('Error updating attachment table on deletion:', e);
        }
      }
    }

    // Delete unassigned barcodes
    await db.query('DELETE FROM "tbl_asset_opening_stock" WHERE purchase_id = $1 AND status = \'Active\'', [id]);

    // Delete movements associated with this purchase
    await db.query("DELETE FROM tbl_inventory_movement WHERE reference_table = 'tbl_Purchases' AND reference_id = $1", [id]);

    await db.query('DELETE FROM tbl_Purchases WHERE id = $1', [id]);

    if (Array.isArray(parsedForSync)) {
      for (const item of parsedForSync) {
        const assetId = await resolveAssetIdByName(item.item_name);
        if (assetId) await recalculateAssetInventory(assetId, clientIdVal, countryIdVal);
      }
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPurchaseAssignedQuantities = async (req, res) => {
  try {
    const { id } = req.params;
    const assignedRes = await db.query(
      `SELECT asset_id, COUNT(*) as assigned_count 
       FROM "tbl_asset_opening_stock" 
       WHERE purchase_id = $1 AND status = 'Assigned' AND is_deleted = false
       GROUP BY asset_id`,
      [id]
    );
    
    const result = [];
    for (const row of assignedRes.rows) {
      const assetRes = await db.query(
        `SELECT field_data->>'1781609374288' as name FROM tbl_asset WHERE id = $1`,
        [row.asset_id]
      );
      if (assetRes.rows.length > 0) {
        result.push({
          asset_id: row.asset_id,
          item_name: assetRes.rows[0].name,
          assigned_qty: parseInt(row.assigned_count, 10)
        });
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
