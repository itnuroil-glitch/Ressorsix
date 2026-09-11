const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Ensure tbl_add_on table exists, sim_number column is nullable and clear any duplicate sim_number values
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_add_on (
        id SERIAL PRIMARY KEY,
        tele_id INTEGER,
        client_id INTEGER,
        company_id INTEGER,
        country_id INTEGER,
        role_id INTEGER,
        user_id INTEGER,
        account_number VARCHAR(100),
        sim_number VARCHAR(100),
        activation_date DATE,
        plan_name VARCHAR(255),
        plan_amount NUMERIC(10,2),
        subscription_type VARCHAR(100),
        document_attachments TEXT,
        addon_type VARCHAR(100),
        voice_minute_type VARCHAR(255),
        roaming_category VARCHAR(255),
        addon_details TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query('ALTER TABLE tbl_add_on ALTER COLUMN sim_number DROP NOT NULL');
    await db.query(`
      UPDATE tbl_add_on 
      SET account_number = COALESCE(NULLIF(account_number, ''), sim_number)
      WHERE account_number IS NULL OR account_number = ''
    `);
    await db.query(`UPDATE tbl_add_on SET sim_number = NULL WHERE sim_number IS NOT NULL`);
  } catch (e) {
    // Ignore if table alteration already completed
  }
})();

// Save base64 file attachment locally to backend/Attachment directory
const saveAttachmentLocally = (base64String, fileName) => {
  if (!base64String) return null;
  try {
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

    const uniqueName = Date.now() + '-' + (fileName ? fileName.replace(/\s+/g, '_') : 'addon_attachment.pdf');
    const filePath = path.join(attachmentDir, uniqueName);

    fs.writeFileSync(filePath, buffer);
    return `/backend/Attachment/${uniqueName}`;
  } catch (e) {
    console.error('Error saving attachment locally:', e);
    return null;
  }
};

// Sync attachment into public.attachment table
const syncToAttachmentTable = async (clientId, companyId, filePath, docType = 'Add-on Details') => {
  if (!filePath) return;
  try {
    let resolvedClientId = clientId ? parseInt(clientId, 10) : null;
    if (isNaN(resolvedClientId)) resolvedClientId = null;

    let resolvedCompanyId = companyId ? parseInt(companyId, 10) : null;
    if (isNaN(resolvedCompanyId)) resolvedCompanyId = null;

    if (!resolvedCompanyId && resolvedClientId) {
      const compRes = await db.query(
        'SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id ASC LIMIT 1',
        [resolvedClientId]
      );
      if (compRes.rows.length > 0) resolvedCompanyId = compRes.rows[0].id;
    }

    if (!resolvedCompanyId) {
      const anyComp = await db.query('SELECT id FROM company ORDER BY id ASC LIMIT 1');
      if (anyComp.rows.length > 0) resolvedCompanyId = anyComp.rows[0].id;
    }

    // Check if attachment already exists in attachment table to avoid duplicate rows
    const existing = await db.query(
      'SELECT id FROM attachment WHERE attachment = $1 AND (is_deleted = false OR is_deleted IS NULL) LIMIT 1',
      [filePath]
    );

    if (existing.rows.length === 0) {
      const insertQuery = `
        INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NULL, 1, false, NOW(), NOW())
        RETURNING *
      `;
      await db.query(insertQuery, [resolvedClientId, resolvedCompanyId, filePath, docType]);
      console.log(`✅ Synced file ${filePath} into public.attachment table!`);
    }
  } catch (e) {
    console.error('Error syncing file to public.attachment table:', e);
  }
};

// Helper to normalize any date format (DD/MM/YYYY, ISO, etc.) to YYYY-MM-DD
const normalizeDate = (rawDate) => {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  // Match ISO YYYY-MM-DD
  const ymd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  return str.split('T')[0];
};

// Helper to extract clean field values from body
const extractAddonFields = (body = {}) => {
  const accountNumber = body.account_number || body['Account No'] || body.sim_number || '';
  const simNumber = null; // Only store in account_number column in tbl_add_on
  const rawActDate = body.activation_date || body['Activation Date'];
  const activationDate = normalizeDate(rawActDate) || new Date().toISOString().split('T')[0];
  const planName = body.plan_name || body['Plan Name'] || '';
  const rawAmount = body.plan_amount || body['Plan Amount'] || body.monthly_plan_amount || 0;
  const planAmount = parseFloat(rawAmount) || 0;
  const subscriptionType = body.subscription_type || body.subscription || body['Subscription'] || 'One Time';
  const addonType = body.addon_type || body['Addon Type'] || body.add_on || 'Data';
  const voiceMinuteType = body.voice_minute_type || body['Voice Minute Type'] || body['Voice Category'] || null;
  const roamingCategory = body.roaming_category || body['Roaming Category'] || null;

  // Build comprehensive addon_details string from dynamic detail entries
  let addonDetails = null;
  const isRoaming = addonType === 'Roaming';
  const isVoice = addonType === 'Voice';

  if (isRoaming && roamingCategory) {
    const cats = String(roamingCategory).split(',').map(s => s.trim()).filter(Boolean);
    const detailParts = [];
    cats.forEach(c => {
      const cleanKey = c.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const val = body[`roaming_details_${cleanKey}`] || body[`${c} Roaming Details`];
      if (val && typeof val === 'string' && val.trim()) {
        detailParts.push(`${c}: ${val.trim()}`);
      }
    });
    if (detailParts.length > 0) {
      addonDetails = detailParts.join('; ');
    }
  } else if (isVoice && voiceMinuteType) {
    const cats = String(voiceMinuteType).split(',').map(s => s.trim()).filter(Boolean);
    const detailParts = [];
    cats.forEach(c => {
      const cleanKey = c.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const val = body[`voice_details_${cleanKey}`] || body[`${c} Details`];
      if (val && typeof val === 'string' && val.trim()) {
        detailParts.push(`${c}: ${val.trim()}`);
      }
    });
    if (detailParts.length > 0) {
      addonDetails = detailParts.join('; ');
    }
  }

  // Fallback to direct addon_details or general dynamic search if not built above
  if (!addonDetails) {
    addonDetails = body.addon_details || body['Addon Details'] || null;
  }
  if (!addonDetails) {
    const detailParts = [];
    Object.keys(body).forEach(key => {
      if (
        (key.startsWith('voice_details_') || key.startsWith('roaming_details_') || key.endsWith(' Details')) &&
        body[key] &&
        typeof body[key] === 'string' &&
        key !== 'Addon Details' &&
        key !== 'addon_details'
      ) {
        let label = key
          .replace('voice_details_', '')
          .replace('roaming_details_', '')
          .replace(/_/g, ' ');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        detailParts.push(`${label}: ${body[key]}`);
      }
    });
    if (detailParts.length > 0) {
      addonDetails = detailParts.join('; ');
    }
  }

  // Process attachments
  const pdfBase64 = body.pdf_base64 || null;
  const filesData = Array.isArray(body.files_data) ? body.files_data : [];
  const rawDocs = body.document_attachments !== undefined
    ? body.document_attachments
    : (body.attached_documents !== undefined ? body.attached_documents : (body.attached_pdf || body.pdf_name || null));

  let fileList = [];
  if (Array.isArray(rawDocs)) {
    fileList = [...rawDocs];
  } else if (typeof rawDocs === 'string' && rawDocs.trim()) {
    try {
      const parsed = JSON.parse(rawDocs);
      fileList = Array.isArray(parsed) ? parsed : [rawDocs];
    } catch (e) {
      fileList = rawDocs.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const savedFilePaths = [];

  // 1. Process files_data with base64 data
  if (filesData.length > 0) {
    for (const fItem of filesData) {
      if (fItem && fItem.data && typeof fItem.data === 'string' && fItem.data.startsWith('data:')) {
        const sp = saveAttachmentLocally(fItem.data, fItem.name);
        if (sp) {
          savedFilePaths.push(sp);
          const baseName = fItem.name;
          const idx = fileList.indexOf(baseName);
          if (idx > -1) {
            fileList[idx] = sp;
          } else if (!fileList.includes(sp)) {
            fileList.push(sp);
          }
        }
      }
    }
  }

  // 2. Process single pdfBase64 if provided
  let filePath = null;
  if (pdfBase64 && savedFilePaths.length === 0) {
    const singleName = body.attached_pdf || body.pdf_name || (fileList.length > 0 ? fileList[0] : 'document.pdf');
    filePath = saveAttachmentLocally(pdfBase64, singleName);
    if (filePath) {
      savedFilePaths.push(filePath);
      const idx = fileList.indexOf(singleName);
      if (idx > -1) {
        fileList[idx] = filePath;
      } else if (!fileList.includes(filePath)) {
        fileList.push(filePath);
      }
    }
  }

  const normalizedDocs = fileList.map(f => {
    if (!f || typeof f !== 'string') return null;
    if (f.startsWith('/backend/') || f.startsWith('upload/') || f.startsWith('/Attachment/') || f.startsWith('/upload/')) {
      return f;
    }
    return `/backend/Attachment/${f}`;
  }).filter(Boolean);

  let docJson = null;
  if (body.document_attachments !== undefined || body.attached_documents !== undefined) {
    docJson = JSON.stringify(normalizedDocs);
  } else if (normalizedDocs.length > 0) {
    docJson = JSON.stringify(normalizedDocs);
  }

  return {
    accountNumber,
    simNumber,
    activationDate,
    planName,
    planAmount,
    subscriptionType,
    addonType,
    voiceMinuteType,
    roamingCategory,
    addonDetails,
    docJson,
    filePath,
    normalizedDocs,
    savedFilePaths
  };
};

// Get all Add-Ons from tbl_add_on (with client filtering if provided)
exports.getAllAddOns = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;

    // Direct, cast-free select from tbl_add_on
    const result = await db.query('SELECT * FROM tbl_add_on ORDER BY id DESC');

    // Safe lookup of masters in parallel
    const [companiesRes, clientsRes, employeesRes] = await Promise.all([
      db.query('SELECT id, company_name FROM company').catch(() => ({ rows: [] })),
      db.query('SELECT id, client_name FROM client').catch(() => ({ rows: [] })),
      db.query("SELECT id, first_name || ' ' || last_name AS full_name FROM employee").catch(() => ({ rows: [] }))
    ]);

    const compMap = {};
    companiesRes.rows.forEach(c => { if (c.id) compMap[String(c.id)] = c.company_name; });

    const clientMap = {};
    clientsRes.rows.forEach(c => { if (c.id) clientMap[String(c.id)] = c.client_name; });

    const empMap = {};
    employeesRes.rows.forEach(e => { if (e.id) empMap[String(e.id)] = e.full_name; });

    let rows = result.rows.map(row => {
      const cName = compMap[String(row.company_id)] || 'N/A';
      const clName = clientMap[String(row.client_id)] || 'N/A';
      const uName = empMap[String(row.user_id)] || 'N/A';

      return {
        ...row,
        company_name: cName,
        client_name: clName,
        user_name: uName,
        telecom_provider: 'e& (Etisalat)'
      };
    });

    if (clientId && clientId !== 'null' && clientId !== 'undefined' && String(clientId).trim() !== '') {
      rows = rows.filter(r => String(r.client_id) === String(clientId) || !r.client_id);
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Get single Add-On by ID from tbl_add_on
exports.getAddOnById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_add_on WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Add-On record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching add-on:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Create new Add-On record in tbl_add_on
exports.createAddOn = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      tele_id,
      client_id,
      company_id,
      country_id,
      role_id,
      user_id,
      status
    } = body;

    const extracted = extractAddonFields(body);

    let finalTeleId = tele_id || null;
    if (!finalTeleId && (extracted.simNumber || extracted.accountNumber)) {
      try {
        const tRes = await db.query(
          "SELECT id FROM tbl_telecome_data WHERE field_data->>'sim_number' = $1 OR field_data->>'account_number' = $2 LIMIT 1",
          [extracted.simNumber || '', extracted.accountNumber || '']
        );
        if (tRes.rows.length > 0) {
          finalTeleId = tRes.rows[0].id;
        }
      } catch (e) {}
    }

    const queryText = `
      INSERT INTO tbl_add_on (
        tele_id, client_id, company_id, country_id, role_id, user_id,
        account_number, sim_number, activation_date, plan_name, plan_amount,
        subscription_type, document_attachments, addon_type, voice_minute_type,
        roaming_category, addon_details, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const params = [
      finalTeleId,
      client_id || null,
      company_id || null,
      country_id || null,
      role_id || null,
      user_id || null,
      extracted.accountNumber,
      extracted.simNumber,
      extracted.activationDate,
      extracted.planName,
      extracted.planAmount,
      extracted.subscriptionType,
      extracted.docJson,
      extracted.addonType,
      extracted.voiceMinuteType,
      extracted.roamingCategory,
      extracted.addonDetails,
      status || 'Active'
    ];

    const result = await db.query(queryText, params);

    // Sync all attached files to public.attachment table
    const filesToSync = Array.from(new Set([...(extracted.normalizedDocs || []), ...(extracted.savedFilePaths || [])]));
    for (const fPath of filesToSync) {
      await syncToAttachmentTable(client_id || body.clientid, company_id, fPath, 'Add-on Details');
    }

    res.status(201).json({
      message: 'Add-On created successfully.',
      addon: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating add-on:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Update Add-On record in tbl_add_on
exports.updateAddOn = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const {
      tele_id,
      client_id,
      company_id,
      country_id,
      status,
      updated_by
    } = body;

    const extracted = extractAddonFields(body);

    // 1. Inspect table columns and data types in tbl_add_on
    const colRes = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tbl_add_on'`
    );
    const colMap = {};
    colRes.rows.forEach(r => {
      colMap[r.column_name.toLowerCase()] = r.data_type.toLowerCase();
    });

    const updateClauses = [];
    const values = [];
    let paramIdx = 1;

    const addField = (colName, val) => {
      const lower = colName.toLowerCase();
      if (!colMap[lower]) return; // Skip if column does not exist in table

      const dbType = colMap[lower];

      if (dbType.includes('int')) {
        const parsed = parseInt(val, 10);
        updateClauses.push(`"${colName}" = $${paramIdx}`);
        values.push(Number.isNaN(parsed) ? null : parsed);
        paramIdx++;
      } else if (dbType.includes('numeric') || dbType.includes('double') || dbType.includes('decimal') || dbType.includes('real')) {
        const parsed = parseFloat(val);
        updateClauses.push(`"${colName}" = $${paramIdx}`);
        values.push(Number.isNaN(parsed) ? null : parsed);
        paramIdx++;
      } else if (dbType.includes('json')) {
        updateClauses.push(`"${colName}" = $${paramIdx}::${dbType}`);
        values.push(val ? (typeof val === 'string' ? val : JSON.stringify(val)) : '[]');
        paramIdx++;
      } else if (dbType.includes('date') || dbType.includes('time')) {
        updateClauses.push(`"${colName}" = $${paramIdx}`);
        values.push(val ? normalizeDate(val) : null);
        paramIdx++;
      } else {
        updateClauses.push(`"${colName}" = $${paramIdx}`);
        values.push(val !== undefined && val !== null ? String(val) : null);
        paramIdx++;
      }
    };

    if (tele_id !== undefined) addField('tele_id', tele_id);
    if (client_id !== undefined) addField('client_id', client_id);
    if (company_id !== undefined) addField('company_id', company_id);
    if (country_id !== undefined) addField('country_id', country_id);

    addField('account_number', extracted.accountNumber);
    addField('sim_number', extracted.simNumber);
    addField('activation_date', extracted.activationDate);
    addField('plan_name', extracted.planName);
    addField('plan_amount', extracted.planAmount);
    addField('subscription_type', extracted.subscriptionType);

    if (extracted.docJson !== null) {
      addField('document_attachments', extracted.docJson);
    }

    addField('addon_type', extracted.addonType);
    addField('voice_minute_type', extracted.voiceMinuteType);
    addField('roaming_category', extracted.roamingCategory);
    addField('addon_details', extracted.addonDetails);

    if (status) addField('status', status);
    if (updated_by) addField('updated_by', updated_by);
    if (colMap['updated_at']) {
      updateClauses.push(`"updated_at" = CURRENT_TIMESTAMP`);
    }

    if (updateClauses.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    values.push(id);
    const queryText = `
      UPDATE tbl_add_on
      SET ${updateClauses.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING *
    `;

    const result = await db.query(queryText, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Add-On record not found' });
    }

    // Sync all attached files to public.attachment table
    let finalClientId = client_id || body.clientid;
    let finalCompanyId = company_id;
    if (!finalClientId || !finalCompanyId) {
      try {
        const curRow = await db.query('SELECT client_id, company_id FROM tbl_add_on WHERE id = $1', [id]);
        if (curRow.rows.length > 0) {
          if (!finalClientId) finalClientId = curRow.rows[0].client_id;
          if (!finalCompanyId) finalCompanyId = curRow.rows[0].company_id;
        }
      } catch (e) {}
    }

    const filesToSync = Array.from(new Set([...(extracted.normalizedDocs || []), ...(extracted.savedFilePaths || [])]));
    for (const fPath of filesToSync) {
      await syncToAttachmentTable(finalClientId, finalCompanyId, fPath, 'Add-on Details');
    }

    res.status(200).json({
      message: 'Add-On updated successfully.',
      addon: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating add-on:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Delete Add-On record from tbl_add_on
exports.deleteAddOn = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM tbl_add_on WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Add-On record not found' });
    }
    res.status(200).json({ message: 'Add-On deleted successfully.' });
  } catch (error) {
    console.error('Error deleting add-on:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Get all distinct account numbers filtered by company and client
exports.getAccountNumbers = async (req, res) => {
  try {
    const { client_id, company_id, clientid } = req.query;
    const activeClientId = client_id || clientid;
    const activeCompanyId = company_id;

    // Resolve company name if company_id is provided
    let companyName = null;
    if (activeCompanyId) {
      try {
        const compRes = await db.query(
          'SELECT id, company_name FROM company WHERE id = $1',
          [activeCompanyId]
        );
        if (compRes.rows.length > 0) {
          companyName = compRes.rows[0].company_name;
        }
      } catch (e) {}
    }

    // Helper to extract custom field names
    let idToName = {};
    try {
      const fieldDefsRes = await db.query(
        'SELECT field_id, field_name FROM tbl_customfield_details'
      ).catch(() => ({ rows: [] }));
      fieldDefsRes.rows.forEach(r => {
        if (r.field_id && r.field_name) {
          idToName[String(r.field_id).trim()] = r.field_name.trim().toLowerCase();
        }
      });
      const cfRes = await db.query(
        'SELECT field_data FROM tbl_customfields WHERE isdelete = false OR isdelete IS NULL'
      ).catch(() => ({ rows: [] }));
      cfRes.rows.forEach(r => {
        let cfd = r.field_data;
        if (typeof cfd === 'string') {
          try { cfd = JSON.parse(cfd); } catch (e) { cfd = []; }
        }
        if (Array.isArray(cfd)) {
          cfd.forEach(sec => {
            (sec.fields || []).forEach(f => {
              if (f.id && f.name) {
                idToName[String(f.id).trim()] = f.name.trim().toLowerCase();
              }
            });
          });
        }
      });
    } catch (e) {}

    // 1. Fetch from tbl_sim_details
    let simDetailsQuery = `
      SELECT 
        sd.tele_id AS id,
        sd.clientid,
        sd.company_id,
        sd.field_data,
        sd.status
      FROM tbl_sim_details sd
      WHERE (sd.is_deleted = 0 OR sd.is_deleted IS NULL)
    `;
    let simParams = [];
    if (activeClientId) {
      simParams.push(String(activeClientId));
      simDetailsQuery += ` AND (sd.clientid::text = $${simParams.length} OR sd.field_data->>'client_id' = $${simParams.length} OR sd.field_data->>'clientid' = $${simParams.length})`;
    }
    const simRes = await db.query(simDetailsQuery, simParams).catch(e => ({ rows: [] }));

    // 2. Fetch from tbl_telecome_data
    let teleDataQuery = `
      SELECT 
        td.id,
        td.clientid,
        td.company_id,
        td.field_data,
        td.extracted_data,
        td.status
      FROM tbl_telecome_data td
      WHERE (td.is_deleted = 0 OR td.is_deleted IS NULL)
    `;
    let teleParams = [];
    if (activeClientId) {
      teleParams.push(String(activeClientId));
      teleDataQuery += ` AND (td.clientid::text = $${teleParams.length} OR td.field_data->>'client_id' = $${teleParams.length} OR td.field_data->>'clientid' = $${teleParams.length})`;
    }
    const teleRes = await db.query(teleDataQuery, teleParams).catch(e => ({ rows: [] }));

    const accountsMap = new Map();

    const processRecord = (row, source) => {
      let fd = row.field_data;
      if (typeof fd === 'string') {
        try { fd = JSON.parse(fd); } catch (e) { fd = {}; }
      }
      if (!fd || typeof fd !== 'object') fd = {};
      if (fd.field_data && typeof fd.field_data === 'object') {
        fd = { ...fd, ...fd.field_data };
      }

      let ed = row.extracted_data;
      if (typeof ed === 'string') {
        try { ed = JSON.parse(ed); } catch (e) { ed = {}; }
      }
      if (!ed || typeof ed !== 'object') ed = {};

      // Filter by company if activeCompanyId is specified
      if (activeCompanyId) {
        const rCompId = String(row.company_id || fd.company_id || fd.company || '').trim();
        const rCompName = String(row.company_name || fd.company_name || fd.company || '').trim();

        let matchesCompany = false;
        if (rCompId) {
          const ids = rCompId.split(',').map(s => s.trim());
          if (ids.includes(String(activeCompanyId))) {
            matchesCompany = true;
          }
        }
        if (!matchesCompany && companyName && rCompName) {
          if (rCompName.toLowerCase() === companyName.toLowerCase() || rCompName.toLowerCase().includes(companyName.toLowerCase())) {
            matchesCompany = true;
          }
        }
        if (!matchesCompany) {
          return;
        }
      }

      // Look for account number
      let accNo = row.account_number || fd.account_number || fd['Account Number'] || fd['Account No'] || fd['Account No '] || ed.account_number || ed.mobile_account;

      // Extract custom field mapping
      let planName = row.plan_name || fd.plan_name || ed.plan_name;
      let planAmount = row.monthly_plan_amount || fd.monthly_plan_amount || ed.monthly_plan_amount || fd.plan_amount;
      let provider = row.telecom_provider || fd.telecom_provider || ed.telecom_provider;
      let employee = row.assigned_employee || fd.assigned_employee || ed.assigned_employee;
      let simNo = row.sim_number || fd.sim_number || ed.sim_number;
      let mobileNo = row.mobile_number || fd.mobile_number || ed.mobile_number;

      for (const [k, v] of Object.entries(fd)) {
        if (v === undefined || v === null || typeof v === 'object') continue;
        const sv = String(v).trim();
        if (!sv || sv === 'null' || sv === 'undefined') continue;

        const fn = (idToName[k] || k).trim().toLowerCase();
        // Explicitly exclude contract numbers from account numbers
        if (fn.includes('contract') || k.trim() === '1786100950188') continue;

        if (!accNo && fn.includes('account')) {
          accNo = sv;
        }
        if (!accNo && (k === '1786109466050' || k === '1787404908551')) {
          accNo = sv;
        }
        if (!planName && (fn.includes('plan') || fn.includes('package')) && !fn.includes('amount')) {
          planName = sv;
        }
        if (!planAmount && (fn.includes('monthly') || fn.includes('rental') || (fn.includes('plan') && fn.includes('amount')))) {
          planAmount = sv;
        }
        if (!provider && (fn.includes('telecom') || fn.includes('provider'))) {
          provider = sv;
        }
        if (!employee && (fn.includes('employee') || fn.includes('assigned'))) {
          employee = sv;
        }
        if (!simNo && fn.includes('sim') && (fn.includes('number') || fn.includes('no') || fn.includes('iccid'))) {
          simNo = sv;
        }
        if (!mobileNo && (k === '1786109549415' || fn.includes('mobile') || fn.includes('phone'))) {
          mobileNo = sv;
        }
      }

      // Fallback for accNo if not explicitly called "account"
      if (!accNo) {
        accNo = row.mobile_account || ed.mobile_account || mobileNo || simNo;
      }

      if (accNo && String(accNo).trim()) {
        const cleanAcc = String(accNo).trim();
        if (!accountsMap.has(cleanAcc)) {
          accountsMap.set(cleanAcc, {
            value: cleanAcc,
            label: cleanAcc,
            account_number: cleanAcc,
            mobile_number: mobileNo || null,
            sim_number: simNo || null,
            plan_name: planName || null,
            plan_amount: planAmount || null,
            monthly_plan_amount: planAmount || null,
            telecom_provider: provider || 'Etisalat',
            assigned_employee: employee || null,
            tele_id: row.id || row.tele_id,
            source
          });
        }
      }
    };

    (simRes.rows || []).forEach(r => processRecord(r, 'sim_details'));
    (teleRes.rows || []).forEach(r => processRecord(r, 'telecom_data'));

    const result = Array.from(accountsMap.values());
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching account numbers:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

