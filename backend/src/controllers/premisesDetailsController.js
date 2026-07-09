const db = require('../config/db');
const fs = require('fs');
const path = require('path');

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
        let attachmentType = 'Premises Details';
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

exports.savePremisesDetails = async (req, res) => {
  try {
    const { premise_id, custom_field_id, field_data, clientid, country_id, moduleid, company_id } = req.body;
    const processedFieldData = await processAndSyncFieldDataFiles(field_data, clientid);
    const jsonData = JSON.stringify(processedFieldData);

    let finalPremiseId = premise_id;
    if (!finalPremiseId) {
      const seqRes = await db.query("SELECT nextval('tbl_premises_details_premise_id_seq') AS next_id");
      finalPremiseId = seqRes.rows[0].next_id;
    }

    const { typeVal, companyVal } = await resolveTypeAndCompany(custom_field_id, field_data);

    const query = `
      INSERT INTO tbl_premises_details (premise_id, custom_field_id, field_data, clientid, country_id, moduleid, type, company, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [finalPremiseId, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, typeVal, companyVal, company_id || null];
    const result = await db.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving premises details:', error);
    res.status(500).json({ message: 'Error saving premises details' });
  }
};

exports.getPremisesDetails = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = 'SELECT * FROM tbl_premises_details';
    const params = [];
    if (clientid) {
      query += ' WHERE clientid = $1';
      params.push(clientid);
    }
    query += ' ORDER BY id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching premises details:', error);
    res.status(500).json({ message: 'Error fetching premises details' });
  }
};

exports.deletePremisesDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const selectQuery = 'SELECT field_data FROM tbl_premises_details WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Premises details record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);

    const query = 'DELETE FROM tbl_premises_details WHERE id = $1 RETURNING *';
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

    res.status(200).json({ message: 'Premises details record deleted successfully' });
  } catch (error) {
    console.error('Error deleting premises details:', error);
    res.status(500).json({ message: 'Error deleting premises details' });
  }
};

exports.updatePremisesDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { premise_id, custom_field_id, field_data, clientid, country_id, moduleid, company_id } = req.body;

    const selectQuery = 'SELECT premise_id, field_data FROM tbl_premises_details WHERE id = $1';
    const selectResult = await db.query(selectQuery, [id]);

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: 'Premises details record not found' });
    }

    const oldFieldData = selectResult.rows[0].field_data;
    const oldPaths = extractFilePaths(oldFieldData);
    const existingPremiseId = selectResult.rows[0].premise_id;

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

    let finalPremiseId = premise_id || existingPremiseId;
    if (!finalPremiseId) {
      const seqRes = await db.query("SELECT nextval('tbl_premises_details_premise_id_seq') AS next_id");
      finalPremiseId = seqRes.rows[0].next_id;
    }

    const jsonData = JSON.stringify(processedFieldData);
    const { typeVal, companyVal } = await resolveTypeAndCompany(custom_field_id, field_data);

    const query = `
      UPDATE tbl_premises_details
      SET premise_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, type = $7, company = $8, company_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [finalPremiseId, custom_field_id || null, jsonData, clientid || null, country_id || null, moduleid || null, typeVal, companyVal, company_id || null, id];
    const result = await db.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating premises details:', error);
    res.status(500).json({ message: 'Error updating premises details' });
  }
};

// Get premises departments by client ID
exports.getPremisesDepartmentsByClient = async (req, res) => {
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

