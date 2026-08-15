const db = require('../config/db');
const fs = require('fs');
const path = require('path');

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
        let attachmentType = 'Vehicle Details';
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

exports.saveVehicleDetails = async (req, res) => {
  try {
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;

    // Save any base64 files locally, insert into public.attachment table, and update the paths
    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid);

    // Convert field_data to JSON string
    const jsonData = JSON.stringify(processedFieldData);

    // Auto generate vehicle_id if it's not provided
    let finalVehicleId = vehicle_id;
    if (!finalVehicleId) {
      const seqRes = await db.query("SELECT nextval('tbl_vehicle_details_vehicle_id_seq') AS next_id");
      finalVehicleId = seqRes.rows[0].next_id;
    }

    const query = `
      INSERT INTO tbl_vehicle_details (vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [finalVehicleId, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, roleid || null, user_id || null, company_id || null];

    const result = await db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving vehicle details:', error);
    res.status(500).json({ message: 'Error saving vehicle details' });
  }
};

exports.getVehicleDetails = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        v.*, 
        c.company_name,
        (SELECT string_agg(role, ', ') FROM role WHERE v.roleid IS NOT NULL AND id::text = ANY(string_to_array(v.roleid::text, ','))) AS role_name, 
        COALESCE(
          (SELECT full_name FROM employee e WHERE LOWER(TRIM(e.email)) = LOWER(TRIM(u.email)) AND (e.is_deleted = false OR e.is_deleted IS NULL) ORDER BY e.id DESC LIMIT 1), 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = v.roleid::text AND e_fallback.clientid::text = v.clientid::text AND (e_fallback.is_deleted = false OR e_fallback.is_deleted IS NULL) ORDER BY e_fallback.id DESC LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_details v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN company c ON v.company_id::text = c.id::text
    `;
    const params = [];
    if (clientid) {
      query += ' WHERE v.clientid::text = $1';
      params.push(clientid);
    }
    query += ' ORDER BY v.id DESC';

    const result = await db.query(query, params);

    // Fetch custom field definitions to accurately extract vehicle name and plate number
    const fieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%vehicle%'
         OR LOWER(field_name) LIKE '%plate%' 
         OR LOWER(field_name) LIKE '%license%' 
         OR LOWER(field_name) LIKE '%liceno%' 
         OR LOWER(field_name) LIKE '%no%'
    `);

    const vehicleNameFieldIds = fieldsRes.rows
      .filter(f => f.field_name.toLowerCase().includes('vehicle'))
      .sort((a, b) => {
        const aName = a.field_name.toLowerCase();
        const bName = b.field_name.toLowerCase();
        const aHasName = aName.includes('name');
        const bHasName = bName.includes('name');
        if (aHasName && !bHasName) return -1;
        if (!aHasName && bHasName) return 1;
        return 0;
      })
      .map(f => f.field_id);

    const vehiclePlateFieldIds = fieldsRes.rows
      .filter(f => !f.field_name.toLowerCase().includes('vehicle'))
      .sort((a, b) => {
        const aName = a.field_name.toLowerCase();
        const bName = b.field_name.toLowerCase();
        const getPriority = (name) => {
          if (name.includes('plate')) return 3;
          if (name.includes('liceno') || name.includes('license')) return 2;
          if (name.includes('no') || name.includes('number')) return 1;
          return 0;
        };
        return getPriority(bName) - getPriority(aName);
      })
      .map(f => f.field_id);

    const finalRows = result.rows.map(row => {
      let fieldData = row.field_data;
      if (typeof fieldData === 'string') {
        try { fieldData = JSON.parse(fieldData); } catch (e) { fieldData = {}; }
      } else {
        fieldData = fieldData || {};
      }

      let vehicleName = '';
      for (const fid of vehicleNameFieldIds) {
        if (fieldData[fid] && typeof fieldData[fid] === 'string') {
          vehicleName = fieldData[fid];
          break;
        }
      }

      let plateNo = '';
      for (const fid of vehiclePlateFieldIds) {
        if (fieldData[fid] && typeof fieldData[fid] === 'string') {
          plateNo = fieldData[fid];
          break;
        }
      }

      // Fallback if missing
      const stringValues = Object.values(fieldData).filter(v => typeof v === 'string' && v.trim());
      if (!vehicleName && stringValues.length > 0) vehicleName = stringValues[0];
      if (!plateNo && stringValues.length > 1) plateNo = stringValues[1];

      let displayName = vehicleName;
      if (plateNo && plateNo !== vehicleName) {
        displayName = vehicleName ? `${vehicleName} - ${plateNo}` : plateNo;
      }

      return {
        ...row,
        vehicle_name: vehicleName || 'N/A',
        plate_no: plateNo || 'N/A',
        vehicle_display_name: displayName || 'N/A'
      };
    });

    res.status(200).json(finalRows);
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    res.status(500).json({ message: 'Error fetching vehicle details' });
  }
};

exports.deleteVehicleDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the existing record to find associated files
    const selectQuery = 'SELECT field_data FROM tbl_vehicle_details WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Vehicle details record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    // Delete the vehicle details record
    const query = 'DELETE FROM tbl_vehicle_details WHERE id = $1 RETURNING *';
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

    res.status(200).json({ message: 'Vehicle details record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle details:', error);
    res.status(500).json({ message: 'Error deleting vehicle details' });
  }
};

exports.updateVehicleDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;

    // Fetch the existing record to find previously associated files
    const selectQuery = 'SELECT vehicle_id, field_data FROM tbl_vehicle_details WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Vehicle details record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);
    const existingVehicleId = selectResult.rows[0].vehicle_id;

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

    // Auto generate vehicle_id if it's not provided or check if it already exists in the record
    let finalVehicleId = vehicle_id || existingVehicleId;
    if (!finalVehicleId) {
      const seqRes = await db.query("SELECT nextval('tbl_vehicle_details_vehicle_id_seq') AS next_id");
      finalVehicleId = seqRes.rows[0].next_id;
    }

    const jsonData = JSON.stringify(processedFieldData);

    const query = `
      UPDATE tbl_vehicle_details
      SET vehicle_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, roleid = $7, user_id = $8, company_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [finalVehicleId, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, roleid || null, user_id || null, company_id || null, id];
    const result = await db.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle details:', error);
    res.status(500).json({ message: 'Error updating vehicle details' });
  }
};

// Get vehicles by client ID (returning id, vehicle_id, and Vehiclename)
exports.getVehiclesByClient = async (req, res) => {
  try {
    let clientId = req.params.clientId || req.params.clientid || req.query.clientId || req.query.clientid;
    if (!clientId || clientId.trim() === '') {
      const clientRes = await db.query('SELECT id FROM client WHERE isdelete = false ORDER BY id ASC LIMIT 1');
      if (clientRes.rows.length > 0) {
        clientId = clientRes.rows[0].id;
      }
    }

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required and no active client found' });
    }

    // 1. Fetch matching custom field IDs for "vehicle"
    const fieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%vehicle%'
    `);

    // Sort so fields containing 'name' get highest priority
    const sortedFields = fieldsRes.rows.sort((a, b) => {
      const aName = a.field_name.toLowerCase();
      const bName = b.field_name.toLowerCase();
      const aHasName = aName.includes('name');
      const bHasName = bName.includes('name');
      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;
      return 0;
    });
    const fieldIds = sortedFields.map(f => f.field_id);

    // Fetch matching custom field IDs for plate numbers or license numbers
    const plateFieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%plate%' 
         OR LOWER(field_name) LIKE '%license%' 
         OR LOWER(field_name) LIKE '%liceno%' 
         OR LOWER(field_name) LIKE '%no%'
    `);

    // Sort so fields containing 'plate' or 'liceno' or 'license' get highest priority, then 'no'
    const sortedPlateFields = plateFieldsRes.rows.sort((a, b) => {
      const aName = a.field_name.toLowerCase();
      const bName = b.field_name.toLowerCase();

      const getPriority = (name) => {
        if (name.includes('plate')) return 3;
        if (name.includes('liceno') || name.includes('license')) return 2;
        if (name.includes('no') || name.includes('number')) return 1;
        return 0;
      };

      return getPriority(bName) - getPriority(aName);
    });
    const plateFieldIds = sortedPlateFields.map(f => f.field_id);

    // 2. Fetch vehicle details for this client
    const query = `
      SELECT id, vehicle_id, field_data 
      FROM tbl_vehicle_details 
      WHERE clientid = $1
      ORDER BY id DESC
    `;
    const { rows } = await db.query(query, [clientId]);

    const formattedVehicles = rows.map(v => {
      let vehicleName = '';
      let plateNo = '';

      let fieldData = v.field_data;
      if (typeof fieldData === 'string') {
        try {
          fieldData = JSON.parse(fieldData);
        } catch (e) {
          fieldData = null;
        }
      }

      if (fieldData) {
        // Find vehicle name
        for (const fid of fieldIds) {
          if (fieldData[fid]) {
            vehicleName = fieldData[fid];
            break;
          }
        }
        // Fallback: if not found, check any key in fieldData that matches fieldsRes
        if (!vehicleName) {
          for (const f of fieldsRes.rows) {
            if (fieldData[f.field_id]) {
              vehicleName = fieldData[f.field_id];
              break;
            }
          }
        }
        // Fallback 2: if still not found, use the first field value
        if (!vehicleName) {
          const keys = Object.keys(fieldData);
          if (keys.length > 0) {
            vehicleName = fieldData[keys[0]];
          }
        }

        // Find plate number
        for (const fid of plateFieldIds) {
          if (fieldData[fid]) {
            plateNo = fieldData[fid];
            break;
          }
        }
        // Fallback: if not found, check any key in fieldData that matches plateFieldsRes
        if (!plateNo) {
          for (const f of plateFieldsRes.rows) {
            if (fieldData[f.field_id]) {
              plateNo = fieldData[f.field_id];
              break;
            }
          }
        }
      }

      // Concatenate plate number with vehicle name if plate number exists and is different from vehicle name
      let displayName = vehicleName;
      if (plateNo && plateNo !== vehicleName) {
        displayName = vehicleName ? `${vehicleName} - ${plateNo}` : plateNo;
      }

      return {
        id: v.id,
        Id: v.id,
        vehicle_id: v.vehicle_id,
        Vehiclename: displayName,
        vehiclename: displayName,
        Plateno: plateNo,
        plateno: plateNo
      };
    });

    res.status(200).json(formattedVehicles);
  } catch (error) {
    console.error('Error fetching vehicles by client:', error);
    res.status(500).json({ message: 'Server error while fetching vehicles by client' });
  }
};

// Get vehicle plate numbers by client ID
exports.getVehiclePlatesByClient = async (req, res) => {
  try {
    let clientId = req.params.clientId || req.params.clientid || req.query.clientId || req.query.clientid;
    if (!clientId || clientId.trim() === '') {
      const clientRes = await db.query('SELECT id FROM client WHERE isdelete = false ORDER BY id ASC LIMIT 1');
      if (clientRes.rows.length > 0) {
        clientId = clientRes.rows[0].id;
      }
    }

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required and no active client found' });
    }

    // 1. Fetch matching custom field IDs for vehicle name and plate numbers or license numbers
    const fieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%vehicle%'
         OR LOWER(field_name) LIKE '%plate%' 
         OR LOWER(field_name) LIKE '%license%' 
         OR LOWER(field_name) LIKE '%liceno%' 
         OR LOWER(field_name) LIKE '%no%'
    `);

    const vehicleNameFieldIds = fieldsRes.rows
      .filter(f => f.field_name.toLowerCase().includes('vehicle'))
      .map(f => f.field_id);
    const vehiclePlateFieldIds = fieldsRes.rows
      .filter(f => !f.field_name.toLowerCase().includes('vehicle'))
      .map(f => f.field_id);

    // 2. Fetch vehicle details for this client
    const query = `
      SELECT id, vehicle_id, field_data 
      FROM tbl_vehicle_details 
      WHERE clientid = $1
      ORDER BY id DESC
    `;
    const { rows } = await db.query(query, [clientId]);

    const formattedVehicles = rows.map(v => {
      let vehicleName = '';
      let plateNo = '';
      if (v.field_data) {
        // Extract vehicle name
        for (const fid of vehicleNameFieldIds) {
          if (v.field_data[fid]) {
            vehicleName = v.field_data[fid];
            break;
          }
        }
        if (!vehicleName) {
          const matchField = fieldsRes.rows.find(f => f.field_name.toLowerCase().includes('vehicle') && v.field_data[f.field_id]);
          if (matchField) vehicleName = v.field_data[matchField.field_id];
        }

        // Extract plate number
        for (const fid of vehiclePlateFieldIds) {
          if (v.field_data[fid]) {
            plateNo = v.field_data[fid];
            break;
          }
        }
        if (!plateNo) {
          const matchField = fieldsRes.rows.find(f => !f.field_name.toLowerCase().includes('vehicle') && v.field_data[f.field_id]);
          if (matchField) plateNo = v.field_data[matchField.field_id];
        }
        if (!plateNo) {
          const keys = Object.keys(v.field_data);
          if (keys.length > 0) {
            plateNo = v.field_data[keys[0]];
          }
        }
      }

      let displayName = plateNo || 'N/A';
      if (vehicleName && vehicleName !== plateNo) {
        displayName = `${vehicleName} - ${plateNo || 'N/A'}`;
      }

      return {
        Plateno: displayName,
        plateno: displayName,
        id: v.id,
        Id: v.id,
        vehicle_id: v.vehicle_id
      };
    });

    res.status(200).json(formattedVehicles);
  } catch (error) {
    console.error('Error fetching vehicle plates by client:', error);
    res.status(500).json({ message: 'Server error while fetching vehicle plates' });
  }
};

// Get vehicle chassis numbers by client ID
exports.getVehicleChassisByClient = async (req, res) => {
  try {
    let clientId = req.params.clientId || req.params.clientid || req.query.clientId || req.query.clientid;
    if (!clientId || clientId.trim() === '') {
      const clientRes = await db.query('SELECT id FROM client WHERE isdelete = false ORDER BY id ASC LIMIT 1');
      if (clientRes.rows.length > 0) {
        clientId = clientRes.rows[0].id;
      }
    }

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required and no active client found' });
    }

    // 1. Fetch matching custom field IDs for chassis or engine or vin
    const fieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%chassis%' 
         OR LOWER(field_name) LIKE '%chasis%' 
         OR LOWER(field_name) LIKE '%vin%' 
         OR LOWER(field_name) LIKE '%engine%'
    `);

    // Sort to prioritize chassis first
    const sortedFields = fieldsRes.rows.sort((a, b) => {
      const aName = a.field_name.toLowerCase();
      const bName = b.field_name.toLowerCase();

      const getPriority = (name) => {
        if (name.includes('chassis') || name.includes('chasis')) return 3;
        if (name.includes('vin')) return 2;
        if (name.includes('engine')) return 1;
        return 0;
      };

      return getPriority(bName) - getPriority(aName);
    });
    const fieldIds = sortedFields.map(f => f.field_id);

    // 2. Fetch vehicle details for this client
    const query = `
      SELECT id, vehicle_id, field_data 
      FROM tbl_vehicle_details 
      WHERE clientid = $1
      ORDER BY id DESC
    `;
    const { rows } = await db.query(query, [clientId]);

    const formattedVehicles = rows.map(v => {
      let chassisNo = '';
      if (v.field_data) {
        for (const fid of fieldIds) {
          if (v.field_data[fid]) {
            chassisNo = v.field_data[fid];
            break;
          }
        }
        // Fallback: check any key in field_data that matches fieldsRes
        if (!chassisNo) {
          for (const f of fieldsRes.rows) {
            if (v.field_data[f.field_id]) {
              chassisNo = v.field_data[f.field_id];
              break;
            }
          }
        }
        // Fallback 2: first field
        if (!chassisNo) {
          const keys = Object.keys(v.field_data);
          if (keys.length > 0) {
            chassisNo = v.field_data[keys[0]];
          }
        }
      }
      return {
        Chassisno: chassisNo,
        chassisno: chassisNo,
        id: v.id,
        Id: v.id,
        vehicle_id: v.vehicle_id
      };
    });

    res.status(200).json(formattedVehicles);
  } catch (error) {
    console.error('Error fetching vehicle chassis numbers by client:', error);
    res.status(500).json({ message: 'Server error while fetching vehicle chassis numbers' });
  }
};

