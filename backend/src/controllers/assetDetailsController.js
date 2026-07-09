const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { recalculateAssetInventory } = require('../utils/inventorySync');

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

const resolveTypeAndCompany = async (custom_field_id, fieldData) => {
  let typeVal = null;
  let companyVal = null;
  if (!custom_field_id || !fieldData) return { typeVal, companyVal };
  try {
    const fieldsRes = await db.query(
      'SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1',
      [custom_field_id]
    );
    for (const row of fieldsRes.rows) {
      const name = (row.field_name || '').toLowerCase().trim();
      const val = fieldData[row.field_id];
      if (name === 'type') {
        typeVal = val;
      } else if (name.includes('company') || name.includes('business')) {
        companyVal = val;
      }
    }
  } catch (err) {
    console.error('Error resolving type and company:', err);
  }
  return { typeVal, companyVal };
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
        let attachmentType = 'Asset Details';
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

const syncAssetOpening = async (asset_id, opening_qty, statusVal = 'Active') => {
  if (!opening_qty || isNaN(opening_qty) || opening_qty <= 0) {
    // If no quantity or <= 0, mark all stock for this asset as deleted
    await db.query('UPDATE "tbl_asset_opening_stock" SET is_deleted = true WHERE asset_id = $1', [asset_id]);
    return;
  }

  const qty = parseInt(opening_qty, 10);
  // Only count non-deleted ones
  const currentRes = await db.query('SELECT COUNT(*) FROM "tbl_asset_opening_stock" WHERE asset_id = $1 AND is_deleted = false', [asset_id]);
  const currentCount = parseInt(currentRes.rows[0].count, 10);

  if (currentCount < qty) {
    const toAdd = qty - currentCount;
    for (let i = 0; i < toAdd; i++) {
      const barcode = `AST-${asset_id}-${Date.now()}-${i}`;
      const unique_id = require('crypto').randomBytes(4).toString('hex'); // Generates an 8-character short ID
      await db.query(
        'INSERT INTO "tbl_asset_opening_stock" (asset_id, opening_qty, "Barcode", status, is_deleted, unique_id) VALUES ($1, $2, $3, $4, false, $5)',
        [asset_id, 1, barcode, statusVal, unique_id]
      );
    }
  } else if (currentCount > qty) {
    const toRemove = currentCount - qty;
    // Instead of deleting, we set is_deleted = true
    await db.query(`
      UPDATE "tbl_asset_opening_stock" SET is_deleted = true 
      WHERE id IN (
        SELECT id FROM "tbl_asset_opening_stock" 
        WHERE asset_id = $1 AND is_deleted = false 
        ORDER BY id DESC LIMIT $2
      )`,
      [asset_id, toRemove]
    );
  }
};

exports.saveAssetDetails = async (req, res) => {
  try {
    const { asset_id, custom_field_id, field_data, clientid, country_id, moduleid, company_id } = req.body;

    // --- DUPLICATE ASSET NAME CHECK START ---
    const assetNameFieldId = '1781609374288'; // Custom Field ID for Asset Name
    const newAssetName = field_data ? field_data[assetNameFieldId] : null;

    if (newAssetName) {
      const duplicateCheck = await db.query(
        `SELECT id FROM tbl_asset WHERE field_data->>$1 = $2 LIMIT 1`,
        [assetNameFieldId, newAssetName.trim()]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          message: 'An asset with this exact name already exists. Duplicate entries are not allowed.'
        });
      }
    }
    // --- DUPLICATE ASSET NAME CHECK END ---

    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid);
    const jsonData = JSON.stringify(processedFieldData);

    let finalAssetId = asset_id;
    if (!finalAssetId) {
      const seqRes = await db.query("SELECT nextval('tbl_asset_details_asset_id_seq') AS next_id");
      finalAssetId = seqRes.rows[0].next_id;
    }

    const { typeVal, companyVal } = await resolveTypeAndCompany(custom_field_id, field_data);
    let finalCompanyId = company_id || companyVal;

    if (!finalCompanyId && clientid) {
      try {
        const companyRes = await db.query(
          'SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id ASC LIMIT 1',
          [clientid]
        );
        if (companyRes.rows.length > 0) {
          finalCompanyId = companyRes.rows[0].id;
        }
      } catch (e) {
        console.error('Error fetching fallback company in saveAssetDetails:', e);
      }
    }

    const query = `
      INSERT INTO tbl_asset (asset_fid_id, custom_field_id, field_data, clientid, country_id, moduleid, type, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [finalAssetId, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, typeVal, finalCompanyId || null];
    const result = await db.query(query, values);

    // Sync asset opening stock based on Opening Quantity field
    const openingQtyFieldId = '1781612001954';
    if (processedFieldData && processedFieldData[openingQtyFieldId]) {
      await syncAssetOpening(result.rows[0].id, processedFieldData[openingQtyFieldId]);
    }

    await recalculateAssetInventory(result.rows[0].id, clientid, country_id);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving asset details:', error);
    res.status(500).json({ message: 'Error saving asset details' });
  }
};

exports.getAssetDetails = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = 'SELECT * FROM tbl_asset';
    const params = [];
    if (clientid) {
      query += ' WHERE clientid = $1';
      params.push(clientid);
    }
    query += ' ORDER BY id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching asset details:', error);
    res.status(500).json({ message: 'Error fetching asset details' });
  }
};

exports.deleteAssetDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const selectQuery = 'SELECT field_data FROM tbl_asset WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Asset details record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    const query = 'DELETE FROM tbl_asset WHERE id = $1 RETURNING *';
    await db.query(query, [id]);

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

    // Cleanup opening stock by soft deleting
    await db.query('UPDATE "tbl_asset_opening_stock" SET is_deleted = true WHERE asset_id = $1', [id]);

    await db.query('DELETE FROM tbl_inventory WHERE asset_id = $1', [id]);

    res.status(200).json({ message: 'Asset details record deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset details:', error);
    res.status(500).json({ message: 'Error deleting asset details' });
  }
};

exports.updateAssetDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { asset_id, custom_field_id, field_data, clientid, country_id, moduleid, company_id } = req.body;

    // --- DUPLICATE ASSET NAME CHECK START ---
    const assetNameFieldId = '1781609374288'; // Custom Field ID for Asset Name
    const newAssetName = field_data ? field_data[assetNameFieldId] : null;

    if (newAssetName) {
      // We add "AND id != $3" so it doesn't trigger an error against itself when saving edits
      const duplicateCheck = await db.query(
        `SELECT id FROM tbl_asset WHERE field_data->>$1 = $2 AND id != $3 LIMIT 1`,
        [assetNameFieldId, newAssetName.trim(), id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          message: 'Another asset with this exact name already exists. Duplicate entries are not allowed.'
        });
      }
    }
    // --- DUPLICATE ASSET NAME CHECK END ---

    const selectQuery = 'SELECT asset_fid_id, field_data FROM tbl_asset WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Asset details record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);
    const existingAssetId = selectResult.rows[0].asset_fid_id;

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

    let finalAssetId = asset_id || existingAssetId;
    if (!finalAssetId) {
      const seqRes = await db.query("SELECT nextval('tbl_asset_details_asset_id_seq') AS next_id");
      finalAssetId = seqRes.rows[0].next_id;
    }

    const jsonData = JSON.stringify(processedFieldData);
    const { typeVal, companyVal } = await resolveTypeAndCompany(custom_field_id, field_data);
    let finalCompanyId = company_id || companyVal;

    if (!finalCompanyId && clientid) {
      try {
        const companyRes = await db.query(
          'SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id ASC LIMIT 1',
          [clientid]
        );
        if (companyRes.rows.length > 0) {
          finalCompanyId = companyRes.rows[0].id;
        }
      } catch (e) {
        console.error('Error fetching fallback company in updateAssetDetails:', e);
      }
    }

    const query = `
      UPDATE tbl_asset
      SET asset_fid_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, type = $7, company_id = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const values = [finalAssetId, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, typeVal, finalCompanyId || null, id];
    const result = await db.query(query, values);

    // Sync asset opening stock based on Opening Quantity field
    const openingQtyFieldId = '1781612001954';
    if (processedFieldData && processedFieldData[openingQtyFieldId]) {
      await syncAssetOpening(id, processedFieldData[openingQtyFieldId]);
    } else {
      await syncAssetOpening(id, 0); // Remove all if field is empty or missing
    }

    await recalculateAssetInventory(id, clientid, country_id);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating asset details:', error);
    res.status(500).json({ message: 'Error updating asset details' });
  }
};

exports.getAssetDepartmentsByClient = async (req, res) => {
  try {
    const queryText = `
      SELECT * FROM department 
      WHERE is_delete = false 
      ORDER BY id ASC
    `;
    const result = await db.query(queryText);

    const formattedDepartments = result.rows.map(r => ({
      id: r.id,
      Id: r.id,
      department: r.department_name,
      Department: r.department_name,
      department_name: r.department_name
    }));

    res.status(200).json(formattedDepartments);
  } catch (error) {
    console.error('Error fetching departments from master table:', error);
    res.status(500).json({ message: 'Server error while fetching departments' });
  }
};

exports.getAssetDropdownList = async (req, res) => {
  try {
    const clientid = req.query.clientid || req.query.client_id;
    let query = 'SELECT * FROM tbl_asset';
    const params = [];

    if (clientid) {
      query += ' WHERE clientid = $1';
      params.push(clientid);
    }

    query += ' ORDER BY id DESC';

    const result = await db.query(query, params);

    const fieldRes = await db.query("SELECT field_id, field_name FROM tbl_customfield_details");
    const fieldMapping = {};
    fieldRes.rows.forEach(r => {
      fieldMapping[r.field_id] = r.field_name;
    });

    // Fetch brands and categories to map their IDs to names
    const brandRes = await db.query("SELECT bid, brand_name FROM tbl_asset_brand");
    const brandMapping = {};
    brandRes.rows.forEach(r => { brandMapping[String(r.bid)] = r.brand_name; });

    const catRes = await db.query("SELECT cid, category_name FROM tbl_asset_category");
    const catMapping = {};
    catRes.rows.forEach(r => { catMapping[String(r.cid)] = r.category_name; });

    // Fetch barcodes using optimized aggregation
    const stockRes = await db.query(`
      SELECT
          asset_id,
          array_agg("Barcode") FILTER (WHERE status = 'Active') AS available_barcodes
      FROM "tbl_asset_opening_stock"
      WHERE is_deleted = false
      GROUP BY asset_id
      HAVING COUNT(*) FILTER (WHERE status = 'Active') > 0
    `);
    const stockMapping = {};
    stockRes.rows.forEach(r => {
      stockMapping[r.asset_id] = r.available_barcodes;
    });

    const formattedAssets = result.rows.map(asset => {
      let assetName = `Asset #${asset.id}`;
      let fieldData = {};
      try {
        fieldData = typeof asset.field_data === 'string' ? JSON.parse(asset.field_data) : asset.field_data;
      } catch (e) { }

      let mappedDetails = {};

      if (fieldData) {
        for (const [key, value] of Object.entries(fieldData)) {
          const fieldName = fieldMapping[key] || key;
          const lowerName = fieldName.toLowerCase();

          let finalValue = value;
          if (lowerName.includes('brand') && brandMapping[String(value)]) {
            finalValue = brandMapping[String(value)];
          } else if (lowerName.includes('category') && catMapping[String(value)]) {
            finalValue = catMapping[String(value)];
          }

          if (finalValue && typeof finalValue === 'string') {
            mappedDetails[fieldName] = finalValue;
          }

          if (lowerName.includes('name') && !lowerName.includes('company') && !lowerName.includes('department')) {
            if (finalValue && typeof finalValue === 'string') {
              assetName = finalValue;
            }
          }
        }

        if (assetName === `Asset #${asset.id}` && Object.keys(fieldData).length > 0) {
          for (const val of Object.values(fieldData)) {
            if (val && typeof val === 'string' && val.length < 50) {
              assetName = val;
              break;
            }
          }
        }
      }

      return {
        id: asset.id,
        name: assetName,
        details: mappedDetails,
        barcodes: stockMapping[asset.id] || []
      };
    });

    res.status(200).json(formattedAssets);
  } catch (error) {
    console.error('Error fetching assets for dropdown:', error);
    res.status(500).json({ message: 'Error fetching assets' });
  }
};

exports.checkDuplicateName = async (req, res) => {
  try {
    const { name, excludeId } = req.query;
    if (!name) return res.status(400).json({ isDuplicate: false });

    const assetNameFieldId = '1781609374288';

    let query = `SELECT id FROM tbl_asset WHERE field_data->>$1 = $2`;
    let params = [assetNameFieldId, name.trim()];

    if (excludeId && excludeId !== 'null' && excludeId !== 'undefined') {
      query += ` AND id != $3`;
      params.push(excludeId);
    }

    query += ` LIMIT 1`;

    const duplicateCheck = await db.query(query, params);

    res.status(200).json({ isDuplicate: duplicateCheck.rows.length > 0 });
  } catch (error) {
    console.error('Error checking duplicate asset name:', error);
    res.status(500).json({ message: 'Error checking duplicate' });
  }
};
