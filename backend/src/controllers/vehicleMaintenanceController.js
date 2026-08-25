const db = require('../config/db');
const fs = require('fs');
const path = require('path');

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

// Resolve numeric service detail IDs to text service_name in field_data dynamically for any custom_field_id
const resolveServiceDetailsToNames = async (fieldData, custom_field_id = null) => {
  if (!fieldData || typeof fieldData !== 'object') return fieldData;
  let parsed = typeof fieldData === 'string' ? JSON.parse(fieldData) : { ...fieldData };
  if (!parsed || typeof parsed !== 'object') return fieldData;

  try {
    const serviceRes = await db.query(
      'SELECT id, service_name FROM tbl_service_details WHERE (isdelete = false OR isdelete IS NULL) AND (is_deleted = false OR is_deleted IS NULL)'
    );
    const serviceMap = {};
    serviceRes.rows.forEach(s => {
      serviceMap[String(s.id)] = s.service_name;
    });

    let targetFids = [];
    let fieldQuery = "SELECT field_id, field_name FROM tbl_customfield_details WHERE (LOWER(field_name) LIKE '%service%')";
    const fieldParams = [];
    if (custom_field_id) {
      fieldQuery += " AND custom_fieldsid = $1";
      fieldParams.push(custom_field_id);
    }
    const fieldRes = await db.query(fieldQuery, fieldParams);
    targetFids = fieldRes.rows.map(f => String(f.field_id).trim());

    for (const key of Object.keys(parsed)) {
      const trimmedKey = String(key).trim();
      const isTarget = targetFids.includes(trimmedKey) || trimmedKey === '1786967942496';
      
      const val = parsed[key];
      if (!val || typeof val === 'object') continue;

      const strVal = String(val).trim();
      if (isTarget || serviceMap[strVal]) {
        if (Array.isArray(val)) {
          const resolved = val.map(v => serviceMap[String(v)] || v);
          parsed[key] = resolved.join(', ');
        } else if (serviceMap[strVal]) {
          parsed[key] = serviceMap[strVal];
        } else if (strVal.includes(',')) {
          const parts = strVal.split(',').map(p => p.trim());
          const resolved = parts.map(p => serviceMap[p] || p);
          if (resolved.some((r, idx) => r !== parts[idx])) {
            parsed[key] = resolved.join(', ');
          }
        }
      }
    }
  } catch (e) {
    console.error('Error resolving service details:', e);
  }

  return parsed;
};

// Sanitize field_data to keep ONLY field IDs (numeric keys)
const sanitizeFieldDataOnlyFieldIds = (fieldData) => {
  if (!fieldData) return {};
  let parsed = typeof fieldData === 'string' ? JSON.parse(fieldData) : { ...fieldData };
  if (!parsed || typeof parsed !== 'object') return fieldData;

  const clean = {};
  Object.keys(parsed).forEach(k => {
    const trimmedKey = String(k).trim();
    // Only keep numeric keys (Field IDs)
    if (/^\d+$/.test(trimmedKey)) {
      clean[trimmedKey] = parsed[k];
    }
  });

  return clean;
};

const processAndSyncFieldDataFiles = async (fieldData, clientid, company_id) => {
  if (!fieldData || typeof fieldData !== 'object') {
    return fieldData;
  }

  let finalCompanyId = company_id;
  if (!finalCompanyId && clientid) {
    try {
      const companyRes = await db.query(
        'SELECT id FROM company WHERE clientid::text = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id ASC LIMIT 1',
        [String(clientid)]
      );
      if (companyRes.rows.length > 0) {
        finalCompanyId = companyRes.rows[0].id;
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

    // Check if it's a file object with base64 data
    if (val.data && typeof val.data === 'string' && val.data.startsWith('data:')) {
      const savedPath = saveAttachmentLocally(val.data, val.name);
      if (savedPath) {
        let attachmentType = 'Vehicle Maintenance';
        if (currentFieldId) {
          try {
            const fieldRes = await db.query(
              'SELECT field_name FROM tbl_customfield_details WHERE field_id = $1 LIMIT 1',
              [currentFieldId]
            );
            if (fieldRes.rows.length > 0) {
              attachmentType = fieldRes.rows[0].field_name;
            }
          } catch (e) {}
        }

        try {
          const insertQuery = `
            INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NULL, 1, false, NOW(), NOW())
          `;
          await db.query(insertQuery, [clientid || null, finalCompanyId || null, savedPath, attachmentType]);
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

// Helper to extract vehicle_id from field_data if not directly provided
const resolveVehicleId = async (vehicle_id, field_data) => {
  if (vehicle_id) return vehicle_id;
  if (!field_data) return null;

  let parsed = typeof field_data === 'string' ? JSON.parse(field_data) : field_data;
  if (!parsed || typeof parsed !== 'object') return null;

  if (parsed.vehicle_id) return parsed.vehicle_id;

  const stringValues = Object.values(parsed).filter(v => v !== null && v !== undefined && typeof v !== 'object' && String(v).trim() !== '');

  // First pass: direct match on vehicle ID or vehicle_id in tbl_vehicle_details
  for (const val of stringValues) {
    const sVal = String(val).trim();
    try {
      const matchRes = await db.query(
        'SELECT vehicle_id, id FROM tbl_vehicle_details WHERE (id::text = $1 OR vehicle_id::text = $1) LIMIT 1',
        [sVal]
      );
      if (matchRes.rows.length > 0) {
        return matchRes.rows[0].vehicle_id || matchRes.rows[0].id;
      }
    } catch (e) {}
  }

  // Second pass: check field_data of tbl_vehicle_details for plate/vehicle name match
  for (const val of stringValues) {
    const sVal = String(val).trim();
    if (sVal.length < 2) continue;
    try {
      const plateRes = await db.query(
        "SELECT vehicle_id, id FROM tbl_vehicle_details WHERE field_data::text LIKE $1 LIMIT 1",
        [`%${sVal}%`]
      );
      if (plateRes.rows.length > 0) {
        return plateRes.rows[0].vehicle_id || plateRes.rows[0].id;
      }
    } catch (e) {}
  }

  return null;
};

exports.saveVehicleMaintenance = async (req, res) => {
  try {
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    
    // Save base64 attachments locally & insert into public.attachment table
    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid, company_id);
    const resolvedVehicleId = await resolveVehicleId(vehicle_id, processedFieldData);
    const resolvedServiceData = await resolveServiceDetailsToNames(processedFieldData, custom_field_id);
    const cleanFieldData = sanitizeFieldDataOnlyFieldIds(resolvedServiceData);
    const jsonData = typeof cleanFieldData === 'object' ? JSON.stringify(cleanFieldData) : cleanFieldData;

    const query = `
      INSERT INTO tbl_vehicle_maintenance (vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      resolvedVehicleId || null,
      custom_field_id || null,
      jsonData,
      clientid || null,
      country_id || null,
      moduleid || 75,
      roleid || null,
      user_id || null,
      company_id || null
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving vehicle maintenance:', error);
    res.status(500).json({ message: 'Error saving vehicle maintenance', error: error.message });
  }
};

exports.getMaintenanceRecords = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        m.*, 
        c.company_name,
        cl.client_name,
        COALESCE(
          (SELECT full_name FROM employee e WHERE LOWER(TRIM(e.email)) = LOWER(TRIM(u.email)) AND (e.is_deleted = false OR e.is_deleted IS NULL) ORDER BY e.id DESC LIMIT 1), 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = m.roleid::text AND e_fallback.clientid::text = m.clientid::text AND (e_fallback.is_deleted = false OR e_fallback.is_deleted IS NULL) ORDER BY e_fallback.id DESC LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_maintenance m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN company c ON m.company_id::text = c.id::text
      LEFT JOIN client cl ON m.clientid::text = cl.id::text
      WHERE (m.is_deleted = false OR m.is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      query += ' AND m.clientid::text = $1';
      params.push(clientid);
    }
    query += ' ORDER BY m.id DESC';

    const result = await db.query(query, params);

    // Fetch vehicle name and plate fields definitions
    let vehicleNameFieldIds = [];
    let vehiclePlateFieldIds = [];
    try {
      const allFieldsRes = await db.query('SELECT field_id, field_name FROM tbl_customfield_details');

      const exactNameField = allFieldsRes.rows.find(f => f.field_name.toLowerCase() === 'vehicle name');
      if (exactNameField) {
        vehicleNameFieldIds.push(exactNameField.field_id);
      }
      
      allFieldsRes.rows.forEach(f => {
        const fn = f.field_name.toLowerCase();
        if ((fn.includes('vehicle name') || fn.includes('model') || fn.includes('make')) && !fn.includes('type') && !fn.includes('number')) {
          if (!vehicleNameFieldIds.includes(f.field_id)) {
            vehicleNameFieldIds.push(f.field_id);
          }
        }
        if (fn.includes('plate') || fn.includes('license')) {
          if (!vehiclePlateFieldIds.includes(f.field_id)) {
            vehiclePlateFieldIds.push(f.field_id);
          }
        }
      });
    } catch (e) {}

    // Build vehicle mapping from tbl_vehicle_details
    const vehiclesMap = {};
    try {
      const allVehiclesRes = await db.query(`SELECT id, vehicle_id, field_data FROM tbl_vehicle_details`);
      allVehiclesRes.rows.forEach(v => {
        let vFd = v.field_data;
        if (typeof vFd === 'string') { try { vFd = JSON.parse(vFd); } catch(e) { vFd = {}; } }
        vFd = vFd || {};
        
        let vName = '';
        for (const fid of vehicleNameFieldIds) {
          if (vFd[fid] && String(vFd[fid]).trim()) {
            vName = String(vFd[fid]).trim();
            break;
          }
        }
        let pNo = '';
        for (const fid of vehiclePlateFieldIds) {
          if (vFd[fid] && String(vFd[fid]).trim()) {
            pNo = String(vFd[fid]).trim();
            break;
          }
        }

        const info = {
          id: v.id,
          vehicle_id: v.vehicle_id,
          vehicle_name: vName || 'N/A',
          plate_no: pNo || 'N/A'
        };
        if (v.id) vehiclesMap[String(v.id)] = info;
        if (v.vehicle_id) vehiclesMap[String(v.vehicle_id)] = info;
      });
    } catch (e) {}

    // Fetch all service details map for automatic on-the-fly resolution
    const serviceRes = await db.query(
      'SELECT id, service_name FROM tbl_service_details WHERE (isdelete = false OR isdelete IS NULL) AND (is_deleted = false OR is_deleted IS NULL)'
    );
    const serviceMap = {};
    serviceRes.rows.forEach(s => {
      serviceMap[String(s.id)] = s.service_name;
    });

    // Fetch custom fields grouped by custom_fieldsid for date backfilling on-the-fly
    const customFieldsRes = await db.query('SELECT custom_fieldsid, field_id, field_name, field_type FROM tbl_customfield_details');
    const fieldsBySchema = {};
    customFieldsRes.rows.forEach(f => {
      const schemaId = String(f.custom_fieldsid);
      if (!fieldsBySchema[schemaId]) fieldsBySchema[schemaId] = [];
      fieldsBySchema[schemaId].push(f);
    });

    const defaultDate = new Date().toISOString().split('T')[0];

    const finalRows = result.rows.map(row => {
      let rawFd = row.field_data;
      if (typeof rawFd === 'string') { try { rawFd = JSON.parse(rawFd); } catch(e) { rawFd = {}; } }
      rawFd = rawFd || {};

      const schemaId = String(row.custom_field_id || '37');
      const schemaFields = fieldsBySchema[schemaId] || fieldsBySchema['37'] || fieldsBySchema['42'] || [];
      const dateFids = schemaFields
        .filter(f => (f.field_name || '').toLowerCase().includes('date') || f.field_type === 'Date')
        .map(f => String(f.field_id).trim());

      let needsDbUpdate = false;

      // Resolve option IDs to service detail names on-the-fly
      Object.keys(rawFd).forEach(k => {
        const val = rawFd[k];
        if (val && typeof val !== 'object') {
          const strVal = String(val).trim();
          if (serviceMap[strVal]) {
            rawFd[k] = serviceMap[strVal];
            needsDbUpdate = true;
          } else if (strVal.includes(',')) {
            const parts = strVal.split(',').map(p => p.trim());
            const resolved = parts.map(p => serviceMap[p] || p);
            if (resolved.some((r, idx) => r !== parts[idx])) {
              rawFd[k] = resolved.join(', ');
              needsDbUpdate = true;
            }
          }
        }
      });

      // Fill missing date fields on-the-fly
      for (const dFid of dateFids) {
        if (!rawFd[dFid]) {
          rawFd[dFid] = defaultDate;
          needsDbUpdate = true;
        }
      }

      // Ensure field_data only contains numeric Field IDs
      const cleanFd = sanitizeFieldDataOnlyFieldIds(rawFd);

      let vId = row.vehicle_id;
      let matchedVehicle = vId ? vehiclesMap[String(vId)] : null;

      if (!matchedVehicle) {
        for (const val of Object.values(cleanFd)) {
          if (val && typeof val !== 'object' && vehiclesMap[String(val)]) {
            matchedVehicle = vehiclesMap[String(val)];
            vId = matchedVehicle.vehicle_id || matchedVehicle.id;
            needsDbUpdate = true;
            break;
          }
        }
      }

      // Background DB self-healing sync if record needed updates
      if (needsDbUpdate || (vId && !row.vehicle_id)) {
        db.query(
          'UPDATE tbl_vehicle_maintenance SET vehicle_id = $1, field_data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [vId || row.vehicle_id || null, JSON.stringify(cleanFd), row.id]
        ).catch(e => console.error('Error auto-healing record:', e));
      }

      return {
        ...row,
        field_data: cleanFd,
        vehicle_id: vId || row.vehicle_id || null,
        vehicle_name: matchedVehicle ? matchedVehicle.vehicle_name : 'N/A',
        plate_no: matchedVehicle ? matchedVehicle.plate_no : 'N/A'
      };
    });

    res.status(200).json(finalRows);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    if (error.code === '42P01') {
      return res.status(200).json([]);
    }
    res.status(500).json({ message: 'Error fetching maintenance records' });
  }
};

exports.deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const selectQuery = 'SELECT field_data FROM tbl_vehicle_maintenance WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    const query = 'UPDATE tbl_vehicle_maintenance SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    for (const p of oldPaths) {
      try {
        await db.query(
          'UPDATE attachment SET is_deleted = true, updated_at = NOW() WHERE attachment = $1',
          [p]
        );
      } catch (e) {
        console.error('Error updating attachment table on deletion:', e);
      }
    }

    res.status(200).json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    res.status(500).json({ message: 'Error deleting maintenance record' });
  }
};

exports.updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;

    const selectQuery = 'SELECT field_data FROM tbl_vehicle_maintenance WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid, company_id);
    const resolvedVehicleId = await resolveVehicleId(vehicle_id, processedFieldData);
    const resolvedServiceData = await resolveServiceDetailsToNames(processedFieldData, custom_field_id);
    const cleanFieldData = sanitizeFieldDataOnlyFieldIds(resolvedServiceData);
    const newPaths = extractFilePaths(cleanFieldData);

    const removedPaths = oldPaths.filter(p => !newPaths.includes(p));
    for (const p of removedPaths) {
      try {
        await db.query(
          'UPDATE attachment SET is_deleted = true, updated_at = NOW() WHERE attachment = $1',
          [p]
        );
      } catch (e) {
        console.error('Error updating attachment table on file replacement:', e);
      }
    }

    const jsonData = typeof cleanFieldData === 'object' ? JSON.stringify(cleanFieldData) : cleanFieldData;

    const query = `
      UPDATE tbl_vehicle_maintenance
      SET vehicle_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, roleid = $7, user_id = $8, company_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      resolvedVehicleId || null,
      custom_field_id || null,
      jsonData,
      clientid || null,
      country_id || null,
      moduleid || 75,
      roleid || null,
      user_id || null,
      company_id || null,
      id
    ];

    const result = await db.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    res.status(500).json({ message: 'Error updating maintenance record', error: error.message });
  }
};
