const db = require('../config/db');

exports.getAllSimDetails = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        sd.*, 
        sd.tele_id AS id,
        c.client_name,
        co.name as country_name,
        (
          SELECT string_agg(company_name, ', ') 
          FROM company 
          WHERE id = ANY(string_to_array(nullif(sd.company_id, ''), ',')::integer[])
        ) AS company_name
      FROM tbl_sim_details sd
      LEFT JOIN client c ON sd.clientid::integer = c.id
      LEFT JOIN country co ON sd.country_id = co.id
      WHERE sd.is_deleted = 0
    `;
    let params = [];
    if (clientid) {
      query += ' AND sd.clientid::text = $1';
      params.push(String(clientid));
    }
    query += ' ORDER BY sd.tele_id DESC';
    const result = await db.query(query, params);

    // Fetch field definitions to map custom field IDs to column names
    const { idToName } = await getFieldDefinitions();

    const formattedRows = result.rows.map(row => {
      let fd = row.field_data;
      if (typeof fd === 'string') {
        try { fd = JSON.parse(fd); } catch (e) { fd = {}; }
      }
      if (!fd || typeof fd !== 'object') fd = {};

      if (fd && typeof fd.field_data === 'string') {
        try { fd = { ...fd, ...JSON.parse(fd.field_data) }; } catch (e) {}
      } else if (fd && typeof fd.field_data === 'object' && fd.field_data !== null) {
        fd = { ...fd, ...fd.field_data };
      }

      let telecomProvider = row.telecom_provider || null;
      let mobileNumber = row.mobile_number || row.mobile_account || null;
      let simNumber = row.sim_number || null;
      let accountNumber = row.account_number || null;
      let assignedEmployee = row.assigned_employee || null;
      let planName = row.plan_name || null;
      let monthlyAmount = row.monthly_plan_amount || row.monthly_amount || null;

      // Extract values from fd using idToName custom field mapping
      for (const [k, v] of Object.entries(fd)) {
        if (v === undefined || v === null || typeof v === 'object') continue;
        const sv = String(v).trim();
        if (!sv || sv === 'null' || sv === 'undefined') continue;

        const fn = (idToName[k] || k).trim().toLowerCase();

        // Plan Name
        if (!planName && (fn.includes('plan') || fn.includes('package')) && !fn.includes('amount') && !fn.includes('cost') && !fn.includes('rental') && !fn.includes('price')) {
          planName = sv;
        }

        // Monthly Amount
        if (!monthlyAmount && (fn.includes('monthly') || fn.includes('rental') || (fn.includes('plan') && (fn.includes('amount') || fn.includes('cost') || fn.includes('price'))))) {
          monthlyAmount = sv;
        }

        // Telecom Provider
        if (!telecomProvider && (fn.includes('telecom') || fn.includes('provider'))) {
          telecomProvider = sv;
        }

        // Mobile Number
        if (!mobileNumber && (fn.includes('mobile') || fn.includes('phone'))) {
          mobileNumber = sv;
        }

        // SIM Number
        if (!simNumber && fn.includes('sim') && (fn.includes('number') || fn.includes('no') || fn.includes('iccid'))) {
          simNumber = sv;
        }

        // Account Number
        if (!accountNumber && fn.includes('account')) {
          accountNumber = sv;
        }

        // Assigned Employee
        if (!assignedEmployee && (fn.includes('employee') || fn.includes('assigned') || fn.includes('user name'))) {
          assignedEmployee = sv;
        }
      }

      return {
        ...row,
        telecom_provider: telecomProvider || row.telecom_provider || 'Etisalat',
        mobile_number: mobileNumber || row.mobile_number || null,
        sim_number: simNumber || row.sim_number || null,
        account_number: accountNumber || row.account_number || null,
        assigned_employee: assignedEmployee || row.assigned_employee || null,
        plan_name: planName || row.plan_name || null,
        monthly_plan_amount: monthlyAmount || row.monthly_plan_amount || null
      };
    });

    res.status(200).json(formattedRows);
  } catch (err) {
    console.error('Error fetching SIM details:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getSimDetailById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT sd.*, sd.tele_id AS id, c.client_name, co.name as country_name
      FROM tbl_sim_details sd
      LEFT JOIN client c ON sd.clientid::integer = c.id
      LEFT JOIN country co ON sd.country_id = co.id
      WHERE sd.tele_id = $1 AND sd.is_deleted = 0
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM detail record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching SIM detail by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

// Helper to load all custom field definitions: fieldId -> fieldName and fieldName -> fieldId
let cachedFieldMaps = null;
let lastFieldMapFetch = 0;

async function getFieldDefinitions() {
  const now = Date.now();
  if (cachedFieldMaps && (now - lastFieldMapFetch < 60000)) {
    return cachedFieldMaps;
  }

  const idToName = {};
  const nameToId = {};

  try {
    const fieldDefsRes = await db.query(
      `SELECT field_id, field_name FROM tbl_customfield_details`
    ).catch(() => ({ rows: [] }));
    fieldDefsRes.rows.forEach(r => {
      if (r.field_id && r.field_name) {
        const fid = String(r.field_id).trim();
        const fname = r.field_name.trim();
        idToName[fid] = fname.toLowerCase();
        nameToId[fname.toLowerCase()] = fid;
      }
    });

    const cfRes = await db.query(
      `SELECT field_data FROM tbl_customfields WHERE isdelete = false OR isdelete IS NULL`
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
              const fid = String(f.id).trim();
              const fname = f.name.trim();
              idToName[fid] = fname.toLowerCase();
              nameToId[fname.toLowerCase()] = fid;
            }
          });
        });
      }
    });
  } catch (err) {
    console.error('Error fetching custom field definitions:', err);
  }

  cachedFieldMaps = { idToName, nameToId };
  lastFieldMapFetch = now;
  return cachedFieldMaps;
}

// Ensure field_data stores strictly numeric Custom Field IDs only
const sanitizeFieldData = async (data) => {
  if (!data || typeof data !== 'object') return {};
  const { nameToId } = await getFieldDefinitions();
  const cleanData = {};

  for (let [key, val] of Object.entries(data)) {
    if (val === '' || val === null || val === undefined) continue;
    const trimmedKey = key.trim();

    // 1. If key is already a numeric custom field ID, keep it
    if (/^\d+$/.test(trimmedKey)) {
      cleanData[trimmedKey] = val;
      continue;
    }

    // 2. If key is an English word/label, resolve its corresponding custom field ID
    const lowerKey = trimmedKey.toLowerCase();
    let matchedId = nameToId[lowerKey];
    if (!matchedId) {
      for (const [name, fid] of Object.entries(nameToId)) {
        if (/^\d+$/.test(fid) && (name.includes(lowerKey) || lowerKey.includes(name))) {
          matchedId = fid;
          break;
        }
      }
    }

    if (matchedId && /^\d+$/.test(matchedId) && cleanData[matchedId] === undefined) {
      cleanData[matchedId] = val;
    }
  }

  // Strictly enforce only numeric custom field ID keys
  const finalClean = {};
  for (const [k, v] of Object.entries(cleanData)) {
    if (/^\d+$/.test(k.trim())) {
      finalClean[k.trim()] = v;
    }
  }

  return finalClean;
};

// Background migration to convert existing legacy records in tbl_sim_details to custom field IDs only
let migrationDone = false;
async function migrateExistingSimRecordsToIdsOnly() {
  if (migrationDone) return;
  migrationDone = true;
  try {
    const { nameToId } = await getFieldDefinitions();
    const res = await db.query(`SELECT tele_id, field_data FROM tbl_sim_details WHERE is_deleted = 0`);

    for (const row of res.rows) {
      let fd = row.field_data;
      if (typeof fd === 'string') {
        try { fd = JSON.parse(fd); } catch (e) { fd = {}; }
      }
      if (!fd || typeof fd !== 'object') continue;
      if (fd.field_data && typeof fd.field_data === 'object') {
        fd = { ...fd, ...fd.field_data };
      }

      // Check if any word keys exist
      const keys = Object.keys(fd);
      const hasWordKeys = keys.some(k => !/^\d+$/.test(k.trim()));
      if (!hasWordKeys) continue;

      const idOnlyFd = {};
      for (const [k, v] of Object.entries(fd)) {
        if (v === '' || v === null || v === undefined) continue;
        const tk = k.trim();
        if (/^\d+$/.test(tk)) {
          idOnlyFd[tk] = v;
        } else {
          const lk = tk.toLowerCase();
          let targetId = nameToId[lk];
          if (!targetId) {
            for (const [name, fid] of Object.entries(nameToId)) {
              if (/^\d+$/.test(fid) && (name.includes(lk) || lk.includes(name))) {
                targetId = fid;
                break;
              }
            }
          }
          if (targetId && !idOnlyFd[targetId]) {
            idOnlyFd[targetId] = v;
          }
        }
      }

      await db.query(
        `UPDATE tbl_sim_details SET field_data = $1 WHERE tele_id = $2`,
        [JSON.stringify(idOnlyFd), row.tele_id]
      );
      console.log(`[SIM Migration] Cleaned tele_id ${row.tele_id} to Custom Field IDs only.`);
    }
  } catch (err) {
    console.error('Error running SIM details ID-only migration:', err);
  }
}

// Auto-run migration shortly after server boot
setTimeout(() => {
  migrateExistingSimRecordsToIdsOnly();
}, 2000);

exports.createSimDetail = async (req, res) => {
  try {
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status, ...rest } = req.body;

    // Use field_data if provided, or build field_data from remaining request body properties
    const rawFieldData = field_data || (Object.keys(rest).length > 0 ? rest : {});
    const finalFieldData = await sanitizeFieldData(rawFieldData);

    const result = await db.query(
      `INSERT INTO tbl_sim_details 
        (custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status, is_deleted, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *, tele_id AS id`,
      [
        custom_field_id || null,
        JSON.stringify(finalFieldData),
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : null,
        moduleid || 58,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        status || 'Active'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating SIM detail:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateSimDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_field_id, field_data, clientid, country_id, moduleid, user_id, company_id, status, ...rest } = req.body;

    const rawFieldData = field_data || (Object.keys(rest).length > 0 ? rest : null);
    const finalFieldData = rawFieldData ? await sanitizeFieldData(rawFieldData) : null;

    const result = await db.query(
      `UPDATE tbl_sim_details 
       SET custom_field_id = COALESCE($1, custom_field_id),
           field_data = COALESCE($2, field_data),
           clientid = COALESCE($3, clientid),
           country_id = COALESCE($4, country_id),
           moduleid = COALESCE($5, moduleid),
           user_id = COALESCE($6, user_id),
           company_id = COALESCE($7, company_id),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE tele_id = $9 AND is_deleted = 0 
       RETURNING *, tele_id AS id`,
      [
        custom_field_id || null,
        finalFieldData ? JSON.stringify(finalFieldData) : null,
        clientid ? String(clientid) : null,
        country_id ? parseInt(country_id, 10) : null,
        moduleid || null,
        user_id ? parseInt(user_id, 10) : null,
        company_id ? String(company_id) : null,
        status || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM detail record not found or deleted' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating SIM detail:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteSimDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE tbl_sim_details 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE tele_id = $1 RETURNING *, tele_id AS id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIM detail record not found' });
    }

    res.status(200).json({ message: 'SIM detail record deleted successfully' });
  } catch (err) {
    console.error('Error deleting SIM detail:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
