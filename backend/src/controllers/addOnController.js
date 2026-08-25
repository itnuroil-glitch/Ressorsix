const db = require('../config/db');
const fs = require('fs');
const path = require('path');

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
const syncToAttachmentTable = async (clientId, companyId, filePath, docType = 'Document Attachments') => {
  if (!filePath) return;
  try {
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && clientId) {
      const compRes = await db.query(
        'SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id ASC LIMIT 1',
        [clientId]
      );
      if (compRes.rows.length > 0) resolvedCompanyId = compRes.rows[0].id;
    }

    const insertQuery = `
      INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NULL, 1, false, NOW(), NOW())
    `;
    await db.query(insertQuery, [clientId || null, resolvedCompanyId || null, filePath, docType]);
    console.log(`✅ Synced file ${filePath} into public.attachment table!`);
  } catch (e) {
    console.error('Error syncing file to public.attachment table:', e);
  }
};

// Helper to extract clean field values from body
const extractAddonFields = (body = {}) => {
  const accountNumber = body.account_number || body['Account No'] || body.sim_number || '';
  const simNumber = body.sim_number || body['Sim No'] || accountNumber;
  const activationDate = body.activation_date || body['Activation Date'] || new Date().toISOString().split('T')[0];
  const planName = body.plan_name || body['Plan Name'] || '';
  const rawAmount = body.plan_amount || body['Plan Amount'] || 0;
  const planAmount = parseFloat(rawAmount) || 0;
  const subscriptionType = body.subscription_type || body.subscription || body['Subscription'] || 'One Time';
  const addonType = body.addon_type || body['Addon Type'] || body.add_on || 'Data';
  const voiceMinuteType = body.voice_minute_type || body['Voice Minute Type'] || body['Voice Category'] || null;
  const roamingCategory = body.roaming_category || body['Roaming Category'] || null;

  // Build comprehensive addon_details string from all dynamic detail entries
  let addonDetails = body.addon_details || body['Addon Details'] || null;
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
  const fileName = body.attached_pdf || body.pdf_name || (Array.isArray(body.document_attachments) ? body.document_attachments[0] : body.document_attachments) || null;

  let filePath = null;
  if (pdfBase64) {
    filePath = saveAttachmentLocally(pdfBase64, fileName);
  } else if (fileName && typeof fileName === 'string' && fileName.trim()) {
    filePath = fileName.startsWith('/backend/') || fileName.startsWith('upload/') ? fileName : `/backend/Attachment/${fileName}`;
  }

  let docJson = null;
  if (filePath) {
    docJson = JSON.stringify([filePath]);
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
    filePath
  };
};

// Get all Add-Ons from tbl_add_on_data (with client filtering if provided)
exports.getAllAddOns = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    let queryText = `
      SELECT 
        a.*, 
        c.client_name,
        co.name as country_name,
        (
          SELECT string_agg(company_name, ', ') 
          FROM company 
          WHERE id = ANY(string_to_array(nullif(a.company_id, ''), ',')::integer[])
        ) AS company_name,
        COALESCE(
          (SELECT first_name || ' ' || last_name FROM employee WHERE id = a.user_id LIMIT 1),
          a.assigned_employee,
          'N/A'
        ) AS user_name,
        COALESCE(a.telecom_provider, 'e& (Etisalat)') AS telecom_provider
      FROM tbl_add_on_data a
      LEFT JOIN client c ON a.client_id = c.id
      LEFT JOIN country co ON a.country_id = co.id
      WHERE 1=1
    `;
    let params = [];
    if (clientId) {
      queryText += ` AND (a.client_id = $1 OR a.client_id IS NULL)`;
      params.push(String(clientId));
    }
    queryText += ` ORDER BY a.id DESC`;

    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Get single Add-On by ID from tbl_add_on_data
exports.getAddOnById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tbl_add_on_data WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Add-On record not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching add-on:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Create new Add-On record in tbl_add_on_data
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

    const queryText = `
      INSERT INTO tbl_add_on_data (
        tele_id, client_id, company_id, country_id, role_id, user_id,
        account_number, sim_number, activation_date, plan_name, plan_amount,
        subscription_type, document_attachments, addon_type, voice_minute_type,
        roaming_category, addon_details, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const params = [
      tele_id || null,
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

    // Sync file to public.attachment table
    if (extracted.filePath) {
      await syncToAttachmentTable(client_id, company_id, extracted.filePath);
    }
    
    // Mirror to tbl_add_on table for compatibility
    try {
      await db.query(
        `INSERT INTO tbl_add_on (tele_id, client_id, company_id, country_id, role_id, user_id, account_number, sim_number, activation_date, plan_name, plan_amount, subscription_type, document_attachments, addon_type, voice_minute_type, roaming_category, addon_details, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        params
      );
    } catch(e) {}

    res.status(201).json({
      message: 'Add-On created successfully.',
      addon: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating add-on:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Update Add-On record in tbl_add_on_data
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

    const queryText = `
      UPDATE tbl_add_on_data
      SET tele_id = COALESCE($1, tele_id),
          client_id = COALESCE($2, client_id),
          company_id = COALESCE($3, company_id),
          country_id = COALESCE($4, country_id),
          account_number = COALESCE($5, account_number),
          sim_number = COALESCE($6, sim_number),
          activation_date = COALESCE($7, activation_date),
          plan_name = COALESCE($8, plan_name),
          plan_amount = COALESCE($9, plan_amount),
          subscription_type = COALESCE($10, subscription_type),
          document_attachments = COALESCE($11, document_attachments),
          addon_type = COALESCE($12, addon_type),
          voice_minute_type = COALESCE($13, voice_minute_type),
          roaming_category = COALESCE($14, roaming_category),
          addon_details = COALESCE($15, addon_details),
          status = COALESCE($16, status),
          updated_by = COALESCE($17, updated_by),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `;

    const params = [
      tele_id || null,
      client_id || null,
      company_id || null,
      country_id || null,
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
      status || null,
      updated_by || null,
      id
    ];

    const result = await db.query(queryText, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Add-On record not found' });
    }

    // Sync file to public.attachment table
    if (extracted.filePath) {
      await syncToAttachmentTable(client_id, company_id, extracted.filePath);
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

// Delete Add-On record from tbl_add_on_data
exports.deleteAddOn = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM tbl_add_on_data WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Add-On record not found' });
    }
    res.status(200).json({ message: 'Add-On deleted successfully.' });
  } catch (error) {
    console.error('Error deleting add-on:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
