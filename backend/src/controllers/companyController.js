const pool = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Helper: recalculate and update is_multi_country for a given client
const recalculateMultiCountry = async (clientId) => {
  if (!clientId) return;
  try {
    const result = await pool.query(
      `SELECT COUNT(DISTINCT country) AS country_count
       FROM company
       WHERE clientid = $1
         AND (is_deleted = false OR is_deleted IS NULL)
         AND country IS NOT NULL AND country <> ''`,
      [clientId]
    );
    const count = parseInt(result.rows[0].country_count, 10);
    const isMultiCountry = count > 1 ? 1 : 0;
    await pool.query(
      'UPDATE client SET is_multi_country = $1 WHERE id = $2',
      [isMultiCountry, clientId]
    );
    console.log(`[MultiCountry] client ${clientId} => is_multi_country = ${isMultiCountry}`);
  } catch (err) {
    console.error('[MultiCountry] Error recalculating:', err.message);
  }
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


// Get all companies
exports.getAllCompanies = async (req, res) => {
  try {
    const query = `
      SELECT c.*, cl.client_name as client_name,
             a.attachment as trade_license_attachment_path
      FROM company c
      LEFT JOIN client cl ON c.clientid = cl.id
      LEFT JOIN attachment a ON c.id = a.companyid AND a.type = 'Trade License' AND (a.is_deleted = false OR a.is_deleted IS NULL)
      WHERE c.is_deleted = false OR c.is_deleted IS NULL
      ORDER BY c.id DESC
    `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error while fetching companies' });
  }
};

// Create a new company
exports.createCompany = async (req, res) => {
  try {
    const {
      clientid, company_name, short_code, legal_form, industry, business_activity,
      jurisdiction, licensing_authority, trade_license_number, trade_license_issue_date,
      trade_license_expiry_date, company_status, country, emirate, registered_address,
      po_box, contact_person, contact_email, contact_phone, website, vat_registered, trn,
      corporate_tax_registration_number, establishment_card_number, establishment_card_expiry_date,
      mohre_number, wps_registered, nafis_emiratisation_applicable, gpssa_applicable,
      authorized_signatory_name, authorized_signatory_designation, default_bank,
      default_currency, asset_prefix, vehicle_prefix, employee_prefix,
      trade_license_alert_days, establishment_card_alert_days, insurance_alert_days,
      trade_license_attachment_base64, trade_license_attachment_name
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ message: 'Company name is required.' });
    }

    let finalClientId = clientid;
    if (!finalClientId) {
      const clientRes = await pool.query('SELECT id FROM client ORDER BY id ASC LIMIT 1');
      if (clientRes.rows.length > 0) {
        finalClientId = clientRes.rows[0].id;
      }
    }

    const query = `
      INSERT INTO company (
        clientid, company_name, short_code, legal_form, industry, business_activity,
        jurisdiction, licensing_authority, trade_license_number, trade_license_issue_date,
        trade_license_expiry_date, company_status, country, emirate, registered_address,
        po_box, contact_person, contact_email, contact_phone, website, vat_registered, trn,
        corporate_tax_registration_number, establishment_card_number, establishment_card_expiry_date,
        mohre_number, wps_registered, nafis_emiratisation_applicable, gpssa_applicable,
        authorized_signatory_name, authorized_signatory_designation, default_bank,
        default_currency, asset_prefix, vehicle_prefix, employee_prefix,
        trade_license_alert_days, establishment_card_alert_days, insurance_alert_days,
        is_deleted, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35, $36, $37, $38, $39,
        false, NOW(), NOW()
      ) RETURNING *;
    `;

    const values = [
      finalClientId, company_name, short_code, legal_form, industry, business_activity,
      jurisdiction, licensing_authority, trade_license_number, trade_license_issue_date,
      trade_license_expiry_date, company_status, country, emirate, registered_address,
      po_box, contact_person, contact_email, contact_phone, website, vat_registered, trn,
      corporate_tax_registration_number, establishment_card_number, establishment_card_expiry_date,
      mohre_number, wps_registered, nafis_emiratisation_applicable, gpssa_applicable,
      authorized_signatory_name, authorized_signatory_designation, default_bank,
      default_currency, asset_prefix, vehicle_prefix, employee_prefix,
      trade_license_alert_days || 30, establishment_card_alert_days || 30, insurance_alert_days || 30
    ];

    const { rows } = await pool.query(query, values);
    const newCompany = rows[0];

    // Save Trade License Attachment if provided
    if (trade_license_attachment_base64) {
      try {
        const savedFilePath = saveAttachmentLocally(trade_license_attachment_base64, trade_license_attachment_name);
        const insertAttachmentQuery = `
          INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, 1, false, NOW(), NOW())
        `;
        await pool.query(insertAttachmentQuery, [
          finalClientId,
          newCompany.id,
          savedFilePath,
          'Trade License',
          trade_license_expiry_date || null
        ]);
      } catch (err) {
        console.error('Error saving trade license attachment:', err);
      }
    }

    // Auto-generate password and send via email if contact_email is provided
    if (contact_email && finalClientId) {
      try {
        const generatedPassword = crypto.randomBytes(4).toString('hex');
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Insert into users table
        const insertUserQuery = `
          INSERT INTO users (email, password, created_at, status, isdelete, clientid, companyid)
          VALUES ($1, $2, NOW(), 1, false, $3, $4)
          RETURNING id
        `;
        await pool.query(insertUserQuery, [contact_email.trim().toLowerCase(), hashedPassword, finalClientId, newCompany.id]);

        const { sendEmail } = require('../config/mailer');
        await sendEmail({
          to: contact_email,
          subject: 'Your Company Account Credentials',
          text: `Hello ${contact_person || 'there'},\n\nYour company profile for "${company_name}" has been created successfully.\n\nYour temporary login credentials are:\nEmail: ${contact_email}\nPassword: ${generatedPassword}\n\nPlease log in and update your password.\n\nBest regards,\nSystem Administrator`,
          clientid: finalClientId
        });
      } catch (err) {
        console.error('Error in user creation / emailing during company setup:', err);
      }
    }

    // Auto-calculate is_multi_country for the linked client
    await recalculateMultiCountry(finalClientId);

    res.status(201).json({ message: 'Company created successfully', company: newCompany });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Server error while creating company' });
  }
};

// Update a company
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clientid, company_name, short_code, legal_form, industry, business_activity,
      jurisdiction, licensing_authority, trade_license_number, trade_license_issue_date,
      trade_license_expiry_date, company_status, country, emirate, registered_address,
      po_box, contact_person, contact_email, contact_phone, website, vat_registered, trn,
      corporate_tax_registration_number, establishment_card_number, establishment_card_expiry_date,
      mohre_number, wps_registered, nafis_emiratisation_applicable, gpssa_applicable,
      authorized_signatory_name, authorized_signatory_designation, default_bank,
      default_currency, asset_prefix, vehicle_prefix, employee_prefix,
      trade_license_alert_days, establishment_card_alert_days, insurance_alert_days,
      trade_license_attachment_base64, trade_license_attachment_name
    } = req.body;

    const checkQuery = 'SELECT id FROM company WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const query = `
      UPDATE company SET
        clientid = $1, company_name = $2, short_code = $3, legal_form = $4, industry = $5,
        business_activity = $6, jurisdiction = $7, licensing_authority = $8,
        trade_license_number = $9, trade_license_issue_date = $10, trade_license_expiry_date = $11,
        company_status = $12, country = $13, emirate = $14, registered_address = $15,
        po_box = $16, contact_person = $17, contact_email = $18, contact_phone = $19,
        website = $20, vat_registered = $21, trn = $22, corporate_tax_registration_number = $23,
        establishment_card_number = $24, establishment_card_expiry_date = $25, mohre_number = $26,
        wps_registered = $27, nafis_emiratisation_applicable = $28, gpssa_applicable = $29,
        authorized_signatory_name = $30, authorized_signatory_designation = $31, default_bank = $32,
        default_currency = $33, asset_prefix = $34, vehicle_prefix = $35, employee_prefix = $36,
        trade_license_alert_days = $37, establishment_card_alert_days = $38, insurance_alert_days = $39,
        updated_at = NOW()
      WHERE id = $40 RETURNING *;
    `;

    const values = [
      clientid || null, company_name, short_code, legal_form, industry, business_activity,
      jurisdiction, licensing_authority, trade_license_number, trade_license_issue_date,
      trade_license_expiry_date, company_status, country, emirate, registered_address,
      po_box, contact_person, contact_email, contact_phone, website, vat_registered, trn,
      corporate_tax_registration_number, establishment_card_number, establishment_card_expiry_date,
      mohre_number, wps_registered, nafis_emiratisation_applicable, gpssa_applicable,
      authorized_signatory_name, authorized_signatory_designation, default_bank,
      default_currency, asset_prefix, vehicle_prefix, employee_prefix,
      trade_license_alert_days, establishment_card_alert_days, insurance_alert_days,
      id
    ];

    const { rows } = await pool.query(query, values);
    const updatedCompany = rows[0];

    // Handle attachment
    if (trade_license_attachment_base64) {
      try {
        const savedFilePath = saveAttachmentLocally(trade_license_attachment_base64, trade_license_attachment_name);
        const checkAtt = await pool.query('SELECT id FROM attachment WHERE companyid = $1 AND type = $2', [id, 'Trade License']);
        if (checkAtt.rows.length > 0) {
          await pool.query(
            'UPDATE attachment SET attachment = $1, expire_date = $2, updated_at = NOW() WHERE id = $3',
            [savedFilePath, trade_license_expiry_date || null, checkAtt.rows[0].id]
          );
        } else {
          await pool.query(
            'INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 1, false, NOW(), NOW())',
            [updatedCompany.clientid, id, savedFilePath, 'Trade License', trade_license_expiry_date || null]
          );
        }
      } catch (err) {
        console.error('Error updating trade license attachment:', err);
      }
    }

    // Auto-calculate is_multi_country for the linked client
    await recalculateMultiCountry(updatedCompany.clientid);

    res.status(200).json({ message: 'Company updated successfully', company: updatedCompany });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Server error while updating company' });
  }
};

// Delete a company
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'UPDATE company SET is_deleted = true, updated_at = NOW() WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Server error while deleting company' });
  }
};

// Get companies by client ID (returning Id and Companyname)
exports.getCompaniesByClient = async (req, res) => {
  try {
    let clientId = req.params.clientId || req.params.clientid || req.query.clientId || req.query.clientid;
    if (!clientId || clientId.trim() === '') {
      const clientRes = await pool.query('SELECT id FROM client WHERE isdelete = false ORDER BY id ASC LIMIT 1');
      if (clientRes.rows.length > 0) {
        clientId = clientRes.rows[0].id;
      }
    }

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required and no active client found' });
    }

    const email = req.query.email;
    let assignedCompanyIds = null;

    if (email && email.trim() !== '') {
      // 1. Look up employee by email
      const empRes = await pool.query(
        'SELECT id, roleid FROM employee WHERE email = $1 AND is_deleted = false',
        [email.trim().toLowerCase()]
      );
      if (empRes.rows.length > 0) {
        const employeeId = empRes.rows[0].id;
        const roleId = empRes.rows[0].roleid;
        
        // Only restrict if they are not superadmin/client admin
        if (String(roleId) !== '1' && String(roleId) !== '2') {
          // 2. Fetch assigned companies for this employee
          const compRes = await pool.query(
            'SELECT company_id FROM employee_company WHERE employee_id = $1',
            [employeeId]
          );
          assignedCompanyIds = compRes.rows.map(r => r.company_id);
        }
      }
    }

    let query = `
      SELECT id, company_name, country 
      FROM company 
      WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL)
    `;
    const params = [clientId];

    if (assignedCompanyIds !== null) {
      if (assignedCompanyIds.length > 0) {
        query += ` AND id = ANY($2)`;
        params.push(assignedCompanyIds);
      } else {
        query += ` AND id = -1`;
      }
    }

    query += ` ORDER BY id DESC`;

    const { rows } = await pool.query(query, params);

    const formattedCompanies = rows.map(row => ({
      id: row.id,
      Id: row.id,
      company_name: row.company_name,
      Companyname: row.company_name,
      country: row.country
    }));

    res.status(200).json(formattedCompanies);
  } catch (error) {
    console.error('Error fetching companies by client:', error);
    res.status(500).json({ message: 'Server error while fetching companies by client' });
  }
};

