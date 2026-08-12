const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const resolveVehicleId = async (fieldData, clientId) => {
  if (!fieldData || !clientId) return null;
  try {
    const insuranceValues = Object.values(fieldData)
      .map(v => String(v).trim().toLowerCase())
      .filter(v => v.length > 0 && v !== 'true' && v !== 'false');

    if (insuranceValues.length === 0) return null;

    const vehiclesRes = await db.query(
      'SELECT vehicle_id, field_data FROM tbl_vehicle_details WHERE clientid::text = $1',
      [String(clientId)]
    );

    for (const row of vehiclesRes.rows) {
      if (row.field_data) {
        let fieldDataObj = row.field_data;
        if (typeof fieldDataObj === 'string') {
          try { fieldDataObj = JSON.parse(fieldDataObj); } catch (e) { fieldDataObj = {}; }
        }
        const vehicleValues = Object.values(fieldDataObj)
          .map(v => String(v).trim().toLowerCase())
          .filter(v => v.length > 0);

        const hasMatch = insuranceValues.some(val => {
          if (vehicleValues.includes(val)) return true;
          if (val.includes(' - ')) {
            const parts = val.split(' - ').map(p => p.trim());
            return parts.some(p => vehicleValues.includes(p));
          }
          return vehicleValues.some(v => val.includes(v) || v.includes(val));
        });

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
        let attachmentType = 'Vehicle Insurance';
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

exports.saveVehicleInsurance = async (req, res) => {
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
      INSERT INTO tbl_vehicle_insurance (vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [resolvedVehicleId || null, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, roleid || null, user_id || null, company_id || null];
    
    const result = await db.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving vehicle insurance:', error);
    res.status(500).json({ message: 'Error saving vehicle insurance' });
  }
};

exports.getVehicleInsurance = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        v.*, 
        c.company_name AS company_name,
        (SELECT string_agg(role, ', ') FROM role WHERE v.roleid IS NOT NULL AND id::text = ANY(string_to_array(v.roleid::text, ','))) AS role_name, 
        COALESCE(
          e.full_name, 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = v.roleid::text AND e_fallback.clientid::text = v.clientid::text LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_insurance v
      LEFT JOIN company c ON CASE WHEN v.company_id::text ~ '^[0-9]+$' THEN v.company_id::text::integer ELSE NULL END = c.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN employee e ON u.email = e.email
    `;
    const params = [];
    if (clientid) {
      query += ' WHERE v.clientid::text = $1';
      params.push(clientid);
    }
    query += ' ORDER BY v.id DESC';

    const result = await db.query(query, params);
    const insuranceRows = result.rows;

    if (insuranceRows.length === 0) {
      return res.status(200).json([]);
    }

    // 1. Fetch vehicle details to map vehicle names
    let vehicleQuery = 'SELECT vehicle_id, field_data FROM tbl_vehicle_details';
    let vehicleParams = [];
    if (clientid) {
      vehicleQuery += ' WHERE clientid::text = $1';
      vehicleParams.push(clientid);
    }
    const vehiclesRes = await db.query(vehicleQuery, vehicleParams);

    // Fetch field names for vehicle lookup
    const vehicleFieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%vehicle%'
         OR LOWER(field_name) LIKE '%plate%' 
         OR LOWER(field_name) LIKE '%license%' 
         OR LOWER(field_name) LIKE '%liceno%' 
         OR LOWER(field_name) LIKE '%no%'
    `);

    const vehicleNameFieldIds = vehicleFieldsRes.rows
      .filter(f => f.field_name.toLowerCase().includes('vehicle'))
      .map(f => f.field_id);
    const vehiclePlateFieldIds = vehicleFieldsRes.rows
      .filter(f => !f.field_name.toLowerCase().includes('vehicle'))
      .map(f => f.field_id);

    const vehicleMap = {};
    vehiclesRes.rows.forEach(v => {
      let fieldData = v.field_data;
      if (typeof fieldData === 'string') {
        try { fieldData = JSON.parse(fieldData); } catch (e) { fieldData = null; }
      }
      if (fieldData) {
        let vehicleName = '';
        let plateNo = '';
        for (const fid of vehicleNameFieldIds) {
          if (fieldData[fid]) { vehicleName = fieldData[fid]; break; }
        }
        if (!vehicleName) {
          // Fallback: check any key in fieldData that contains vehicle in name
          const matchField = vehicleFieldsRes.rows.find(f => f.field_name.toLowerCase().includes('vehicle') && fieldData[f.field_id]);
          if (matchField) vehicleName = fieldData[matchField.field_id];
        }
        if (!vehicleName) {
          const keys = Object.keys(fieldData);
          if (keys.length > 0) vehicleName = fieldData[keys[0]];
        }

        for (const fid of vehiclePlateFieldIds) {
          if (fieldData[fid]) { plateNo = fieldData[fid]; break; }
        }
        if (!plateNo) {
          const matchField = vehicleFieldsRes.rows.find(f => !f.field_name.toLowerCase().includes('vehicle') && fieldData[f.field_id]);
          if (matchField) plateNo = fieldData[matchField.field_id];
        }

        let displayName = vehicleName;
        if (plateNo && plateNo !== vehicleName) {
          displayName = vehicleName ? `${vehicleName} - ${plateNo}` : plateNo;
        }
        vehicleMap[v.vehicle_id] = displayName;
      }
    });

    // 2. Fetch field definitions to map Vehicle Name, Start Date, Expiry Date & Insurer dynamically
    const fieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE isdelete = false AND is_active = true
        AND (LOWER(field_name) LIKE '%vehicle%'
          OR LOWER(field_name) LIKE '%start%'
          OR LOWER(field_name) LIKE '%issue%'
          OR LOWER(field_name) LIKE '%effective%'
          OR LOWER(field_name) LIKE '%expire%' 
          OR LOWER(field_name) LIKE '%expiry%' 
          OR LOWER(field_name) LIKE '%end%'
          OR LOWER(field_name) LIKE '%insurer%' 
          OR LOWER(field_name) LIKE '%insurance company%' 
          OR LOWER(field_name) LIKE '%provider%')
    `);

    const vehicleInsuranceFieldIds = fieldsRes.rows
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

    const startDateFieldIds = fieldsRes.rows
      .filter(f => {
        const name = f.field_name.toLowerCase();
        return name.includes('start') || name.includes('issue') || name.includes('effective');
      })
      .map(f => f.field_id);

    const expiryFieldIds = fieldsRes.rows
      .filter(f => {
        const name = f.field_name.toLowerCase();
        return name.includes('expire') || name.includes('expiry') || name.includes('end');
      })
      .map(f => f.field_id);

    const insurerFieldIds = fieldsRes.rows
      .filter(f => {
        const name = f.field_name.toLowerCase();
        return name.includes('insurer') || name.includes('insurance company') || name.includes('provider');
      })
      .map(f => f.field_id);

    // 3. Populate each record
    const finalRows = insuranceRows.map(row => {
      let fieldData = row.field_data;
      if (typeof fieldData === 'string') {
        try { fieldData = JSON.parse(fieldData); } catch (e) { fieldData = {}; }
      } else {
        fieldData = fieldData || {};
      }

      let insuranceVehicleName = null;
      for (const fid of vehicleInsuranceFieldIds) {
        if (fieldData[fid] && typeof fieldData[fid] === 'string' && fieldData[fid].trim()) {
          insuranceVehicleName = fieldData[fid];
          break;
        }
      }
      if (!insuranceVehicleName) {
        // Fallback: search values for formatted string containing ' - '
        const vals = Object.values(fieldData);
        insuranceVehicleName = vals.find(v => typeof v === 'string' && v.includes(' - ')) || null;
      }

      let start_date = null;
      for (const fid of startDateFieldIds) {
        if (fieldData[fid]) {
          start_date = fieldData[fid];
          break;
        }
      }

      let expiry_date = null;
      for (const fid of expiryFieldIds) {
        if (fieldData[fid]) {
          expiry_date = fieldData[fid];
          break;
        }
      }

      let insurer = null;
      for (const fid of insurerFieldIds) {
        if (fieldData[fid]) {
          insurer = fieldData[fid];
          break;
        }
      }

      const vehicle_display_name = insuranceVehicleName || (row.vehicle_id ? vehicleMap[row.vehicle_id] : null) || 'N/A';

      return {
        ...row,
        company_name: row.company_name || 'N/A',
        vehicle_display_name: vehicle_display_name,
        start_date: start_date || 'N/A',
        expiry_date: expiry_date || 'N/A',
        insurer: insurer || 'N/A'
      };
    });

    res.status(200).json(finalRows);
  } catch (error) {
    console.error('Error fetching vehicle insurance:', error);
    res.status(500).json({ message: 'Error fetching vehicle insurance' });
  }
};

exports.deleteVehicleInsurance = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the existing record to find associated files
    const selectQuery = 'SELECT field_data FROM tbl_vehicle_insurance WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);
    
    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Insurance record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    // Delete the vehicle insurance record
    const query = 'DELETE FROM tbl_vehicle_insurance WHERE id = $1 RETURNING *';
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
    
    res.status(200).json({ message: 'Insurance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle insurance:', error);
    res.status(500).json({ message: 'Error deleting vehicle insurance' });
  }
};

exports.updateVehicleInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;

    // Fetch the existing record to find previously associated files
    const selectQuery = 'SELECT field_data FROM tbl_vehicle_insurance WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);
    
    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Insurance record not found' });
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
      UPDATE tbl_vehicle_insurance
      SET vehicle_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, roleid = $7, user_id = $8, company_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [resolvedVehicleId || null, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, roleid || null, user_id || null, company_id || null, id];
    const result = await db.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle insurance:', error);
    res.status(500).json({ message: 'Error updating vehicle insurance' });
  }
};

// Get vehicle policy numbers by client ID
exports.getVehiclePoliciesByClient = async (req, res) => {
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

    // 1. Fetch matching custom field IDs for policy numbers
    const fieldsRes = await db.query(`
      SELECT field_id, field_name 
      FROM tbl_customfield_details 
      WHERE LOWER(field_name) LIKE '%policy%' 
         OR LOWER(field_name) LIKE '%policyno%' 
         OR LOWER(field_name) LIKE '%policy_no%'
    `);
    
    // Sort so fields containing 'number' or 'no' get highest priority
    const sortedFields = fieldsRes.rows.sort((a, b) => {
      const aName = a.field_name.toLowerCase();
      const bName = b.field_name.toLowerCase();
      
      const getPriority = (name) => {
        if (name.includes('number') || name.includes('no')) return 2;
        if (name.includes('policy')) return 1;
        return 0;
      };

      return getPriority(bName) - getPriority(aName);
    });
    const fieldIds = sortedFields.map(f => f.field_id);

    // 2. Fetch vehicle insurance details for this client
    const query = `
      SELECT id, vehicle_id, field_data 
      FROM tbl_vehicle_insurance 
      WHERE clientid = $1
      ORDER BY id DESC
    `;
    const { rows } = await db.query(query, [clientId]);

    const formattedPolicies = rows.map(v => {
      let policyNo = '';
      if (v.field_data) {
        for (const fid of fieldIds) {
          if (v.field_data[fid]) {
            policyNo = v.field_data[fid];
            break;
          }
        }
        // Fallback: if not found, check any key in field_data that matches fieldsRes
        if (!policyNo) {
          for (const f of fieldsRes.rows) {
            if (v.field_data[f.field_id]) {
              policyNo = v.field_data[f.field_id];
              break;
            }
          }
        }
        // Fallback 2: first field
        if (!policyNo) {
          const keys = Object.keys(v.field_data);
          if (keys.length > 0) {
            policyNo = v.field_data[keys[0]];
          }
        }
      }
      return {
        Policyno: policyNo,
        policyno: policyNo,
        id: v.id,
        Id: v.id,
        vehicle_id: v.vehicle_id
      };
    });

    res.status(200).json(formattedPolicies);
  } catch (error) {
    console.error('Error fetching vehicle policies by client:', error);
    res.status(500).json({ message: 'Server error while fetching vehicle policies' });
  }
};


