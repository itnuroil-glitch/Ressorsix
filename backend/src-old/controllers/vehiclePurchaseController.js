const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const resolveVehicleId = async (fieldData, clientId) => {
  if (!fieldData || !clientId) return null;
  try {
    const purchaseValues = Object.values(fieldData)
      .map(v => String(v).trim().toLowerCase())
      .filter(v => v.length > 0 && v !== 'true' && v !== 'false');

    if (purchaseValues.length === 0) return null;

    const vehiclesRes = await db.query(
      'SELECT vehicle_id, field_data FROM tbl_vehicle_details WHERE clientid = $1',
      [clientId]
    );

    for (const row of vehiclesRes.rows) {
      if (row.field_data) {
        const vehicleValues = Object.values(row.field_data)
          .map(v => String(v).trim().toLowerCase())
          .filter(v => v.length > 0);

        const hasMatch = purchaseValues.some(val => vehicleValues.includes(val));
        if (hasMatch) {
          return row.vehicle_id;
        }
      }
    }
  } catch (err) {
    console.error('Error resolving vehicle_id:', err);
  }
  return null;
};

const resolveExpireDate = async (currentFieldId, fieldData) => {
  if (!currentFieldId || !fieldData) return null;
  try {
    // 1. Fetch details of the file field
    const fileFieldRes = await db.query(
      'SELECT custom_fieldsid, section_id, parent_fieldid FROM tbl_customfield_details WHERE field_id = $1 LIMIT 1',
      [currentFieldId]
    );
    if (fileFieldRes.rows.length === 0) return null;
    const { custom_fieldsid, section_id, parent_fieldid } = fileFieldRes.rows[0];

    // 2. Fetch all date/datetime fields in the same custom fields configuration
    let dateFieldsRes;
    if (parent_fieldid) {
      // If nested in a subsection, look for date fields in the same parent_fieldid
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND parent_fieldid = $2 AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [custom_fieldsid, parent_fieldid]
      );
    } else {
      // Otherwise, look for date fields in the same section that have no parent_fieldid
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND section_id = $2 AND parent_fieldid IS NULL AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [custom_fieldsid, section_id]
      );
    }

    if (dateFieldsRes.rows.length === 0) {
      // Fallback: look for ANY date fields in the same section regardless of parent
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND section_id = $2 AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [custom_fieldsid, section_id]
      );
    }

    if (dateFieldsRes.rows.length === 0) return null;

    // 3. Find the best date field candidate
    // Priority 1: Field name contains "expire" or "expiry" or "end"
    let bestCandidate = dateFieldsRes.rows.find(row => {
      const name = row.field_name.toLowerCase();
      return name.includes('expire') || name.includes('expiry') || name.includes('end');
    });

    // Priority 2: Any date field
    if (!bestCandidate) {
      bestCandidate = dateFieldsRes.rows[0];
    }

    // 4. Extract value from fieldData
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

  // Find company id associated with this client
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

  // Helper to recursively traverse and process files
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

    // Check if it's a file object with base64 data
    if (val.data && typeof val.data === 'string' && val.data.startsWith('data:')) {
      const savedPath = saveAttachmentLocally(val.data, val.name);
      if (savedPath) {
        // Query the field_name to use as the attachment type
        let attachmentType = 'Vehicle Purchase';
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

        // Resolve corresponding expire_date
        let expireDate = null;
        if (currentFieldId) {
          expireDate = await resolveExpireDate(currentFieldId, fieldData);
        }

        // Insert into attachment table
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

    // Otherwise, traverse keys
    const processed = {};
    for (const key of Object.keys(val)) {
      // Pass the key as the field ID when descending into the field value
      processed[key] = await traverse(val[key], currentFieldId || key);
    }
    return processed;
  };

  return await traverse(fieldData);
};

exports.saveVehiclePurchase = async (req, res) => {
  try {
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    
    // Save any base64 files locally, insert into public.attachment table, and update the paths
    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid);
    
    // Resolve vehicle_id automatically from field_data if not provided
    let resolvedVehicleId = vehicle_id;
    if (!resolvedVehicleId && processedFieldData) {
      resolvedVehicleId = await resolveVehicleId(processedFieldData, clientid);
    }
    
    // Convert field_data to JSON string
    const jsonData = JSON.stringify(processedFieldData);
    
    const query = `
      INSERT INTO tbl_vehicle_purchase (vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [resolvedVehicleId || null, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, roleid || null, user_id || null, company_id || null];
    
    const result = await db.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving vehicle purchase:', error);
    res.status(500).json({ message: 'Error saving vehicle purchase' });
  }
};

exports.getVehiclePurchase = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        v.*, 
        (SELECT string_agg(role, ', ') FROM role WHERE id = ANY(string_to_array(v.roleid::text, ',')::int[])) AS role_name, 
        COALESCE(
          e.full_name, 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid = v.roleid::text AND e_fallback.clientid = v.clientid LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_purchase v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN employee e ON u.email = e.email
    `;
    const params = [];
    if (clientid) {
      query += ' WHERE v.clientid = $1';
      params.push(clientid);
    }
    query += ' ORDER BY v.id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching vehicle purchase:', error);
    res.status(500).json({ message: 'Error fetching vehicle purchase' });
  }
};

exports.deleteVehiclePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the existing record to find associated files
    const selectQuery = 'SELECT field_data FROM tbl_vehicle_purchase WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);
    
    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Purchase record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    // Delete the vehicle purchase record
    const query = 'DELETE FROM tbl_vehicle_purchase WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    
    // Mark files as deleted in the attachment table
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
    
    res.status(200).json({ message: 'Purchase record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle purchase:', error);
    res.status(500).json({ message: 'Error deleting vehicle purchase' });
  }
};

exports.updateVehiclePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;

    // Fetch the existing record to find previously associated files
    const selectQuery = 'SELECT field_data FROM tbl_vehicle_purchase WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);
    
    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Purchase record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    // Save any new base64 files locally, insert new attachments, and replace their data with local paths
    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid);
    const newPaths = extractFilePaths(processedFieldData);

    // Identify files that were removed
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

    // Resolve vehicle_id automatically from field_data if not provided
    let resolvedVehicleId = vehicle_id;
    if (!resolvedVehicleId && processedFieldData) {
      resolvedVehicleId = await resolveVehicleId(processedFieldData, clientid);
    }

    const jsonData = JSON.stringify(processedFieldData);

    const query = `
      UPDATE tbl_vehicle_purchase
      SET vehicle_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, roleid = $7, user_id = $8, company_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [resolvedVehicleId || null, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, roleid || null, user_id || null, company_id || null, id];
    const result = await db.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle purchase:', error);
    res.status(500).json({ message: 'Error updating vehicle purchase' });
  }
};
