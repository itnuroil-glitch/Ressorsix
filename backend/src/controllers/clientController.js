const db = require('../config/db');
const bcrypt = require('bcryptjs');

// @desc    Get all active clients
// @route   GET /api/clients
// @access  Public
exports.getAllClients = async (req, res) => {
  try {
    const queryText = `
      SELECT * FROM client 
      WHERE isdelete = false 
      ORDER BY id ASC
    `;
    const result = await db.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching clients.' });
  }
};

// @desc    Create a new client
// @route   POST /api/clients
// @access  Public
exports.createClient = async (req, res) => {
  try {
    const {
      client_name,
      companyname,
      company_shortname,
      industry,
      address,
      country,
      state,
      city,
      email,
      trn_no,
      contact_no,
      phone_no,
      website,
      trade_licenseno,
      max_companies,
      max_employess,
      max_asset,
      status,
      enabled_module
    } = req.body;

    if (!client_name) {
      return res.status(400).json({ message: 'Client name is required.' });
    }

    if (email) {
      const userExistQuery = 'SELECT id FROM users WHERE email = $1';
      const userExistResult = await db.query(userExistQuery, [email.toLowerCase().trim()]);

      if (userExistResult.rows.length > 0) {
        return res.status(400).json({ message: 'This email address is already registered to a portal user.' });
      }
    }

    const queryText = `
      INSERT INTO client (
        client_name, companyname, company_shortname, industry, address, 
        country, state, city, email, trn_no, 
        contact_no, phone_no, website, trade_licenseno, max_companies, 
        max_employess, max_asset, status, isdelete, enabled_module
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, false, $19)
      RETURNING *
    `;

    const result = await db.query(queryText, [
      client_name.trim(),
      companyname ? companyname.trim() : null,
      company_shortname ? company_shortname.trim() : null,
      industry ? industry.trim() : null,
      address ? address.trim() : null,
      country ? country.trim() : null,
      state ? state.trim() : null,
      city ? city.trim() : null,
      email ? email.toLowerCase().trim() : null,
      trn_no ? BigInt(trn_no) : null,
      contact_no ? BigInt(contact_no) : null,
      phone_no ? BigInt(phone_no) : null,
      website ? website.trim() : null,
      trade_licenseno ? trade_licenseno.trim() : null,
      max_companies ? parseInt(max_companies, 10) : null,
      max_employess ? parseInt(max_employess, 10) : null,
      max_asset ? parseInt(max_asset, 10) : null,
      status !== undefined ? parseInt(status, 10) : 1,
      enabled_module ? enabled_module.trim() : null
    ]);

    const newClient = result.rows[0];

    // 2. Insert basic info into company table
    let newCompanyId = null;
    if (companyname) {
      const companyQuery = `
        INSERT INTO company (
          clientid,
          company_name,
          short_code,
          industry,
          registered_address,
          country,
          emirate,
          contact_email,
          trn,
          contact_phone,
          website,
          trade_license_number,
          company_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;

      const companyValues = [
        newClient.id,
        companyname.trim(),
        company_shortname ? company_shortname.trim() : null,
        industry ? industry.trim() : null,
        address ? address.trim() : null,
        country ? country.trim() : null,
        state ? state.trim() : null,
        email ? email.toLowerCase().trim() : null,
        trn_no ? trn_no.toString() : null,
        phone_no ? phone_no.toString() : null,
        website ? website.trim() : null,
        trade_licenseno ? trade_licenseno.trim() : null,
        status !== undefined && parseInt(status, 10) === 1 ? 'Active' : 'Inactive'
      ];

      const companyResult = await db.query(companyQuery, companyValues);
      if (companyResult.rows.length > 0) {
        newCompanyId = companyResult.rows[0].id;
      }
    }

    // 3. Insert user record into users table
    if (email) {
      // Check if user already exists
      const userExistQuery = 'SELECT id FROM users WHERE email = $1';
      const userExistResult = await db.query(userExistQuery, [email.toLowerCase().trim()]);

      if (userExistResult.rows.length === 0) {
        // Generate a random temporary password
        const generatePassword = () => {
          const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
          let password = '';
          for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return password;
        };
        const rawPassword = generatePassword();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        const userInsertQuery = `
          INSERT INTO users (
            email,
            password,
            clientid,
            companyid,
            roleid,
            status,
            isdelete
          ) VALUES ($1, $2, $3, $4, $5, $6, false)
        `;

        const userValues = [
          email.toLowerCase().trim(),
          hashedPassword,
          newClient.id,
          newCompanyId,
          2, // Roleid for 'Client'
          status !== undefined ? parseInt(status, 10) : 1
        ];

        await db.query(userInsertQuery, userValues);

        // Fetch superadmin SMTP config and send the welcome email
        const smtpQuery = 'SELECT * FROM smtp_configuration WHERE is_deleted = false AND status = 1 LIMIT 1';
        const smtpResult = await db.query(smtpQuery);

        if (smtpResult.rows.length > 0) {
          const smtp = smtpResult.rows[0];
          const nodemailer = require('nodemailer');

          const transporter = nodemailer.createTransport({
            host: smtp.smtp_host,
            port: parseInt(smtp.smtp_port, 10) || 587,
            secure: smtp.security_protocol === 'SSL' || smtp.smtp_port === 465,
            auth: {
              user: smtp.smtp_usename,
              pass: smtp.smtp_password
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          const mailOptions = {
            from: `"${smtp.from_name || 'Trakio Support'}" <${smtp.from_email || smtp.smtp_usename}>`,
            to: email.toLowerCase().trim(),
            subject: 'Welcome to Trakio - Your Client Account is Ready!',
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                <div style="text-align: center; border-bottom: 2px solid #673ab7; padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #673ab7; margin: 0;">Welcome to Trakio Portal</h2>
                </div>
                <p>Dear ${client_name},</p>
                <p>We are excited to inform you that your Client account has been successfully created in the Trakio Logistics Platform!</p>
                <p>Below are your automatically generated access credentials to log in to your portal:</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #673ab7;">
                  <p style="margin: 5px 0;"><strong>Portal Login URL:</strong> http://localhost:8081</p>
                  <p style="margin: 5px 0;"><strong>Username / Email:</strong> ${email.toLowerCase().trim()}</p>
                  <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; color: #e11d48; font-weight: bold;">${rawPassword}</code></p>
                </div>
                <p style="color: #64748b; font-size: 13px;"><em>Please change your temporary password immediately upon your first login for security purposes.</em></p>
                <p style="margin-top: 30px;">Best regards,<br><strong>Trakio Support Team</strong></p>
              </div>
            `
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log('Successfully sent welcome email to client:', email);
          } catch (mailErr) {
            console.error('Failed to send welcome email:', mailErr);
          }
        } else {
          console.warn('No active SMTP configurations found. Welcome email was not sent.');
        }
      }
    }

    // Convert BigInt columns to String/Number so JSON serialization works without error
    const formattedClient = { ...newClient };
    if (formattedClient.trn_no) formattedClient.trn_no = formattedClient.trn_no.toString();
    if (formattedClient.contact_no) formattedClient.contact_no = formattedClient.contact_no.toString();
    if (formattedClient.phone_no) formattedClient.phone_no = formattedClient.phone_no.toString();

    res.status(201).json({
      message: 'Client created successfully.',
      client: formattedClient
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Internal Server Error while creating client.' });
  }
};

// @desc    Update an existing client
// @route   PUT /api/clients/:id
// @access  Public
exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_name,
      companyname,
      company_shortname,
      industry,
      address,
      country,
      state,
      city,
      email,
      trn_no,
      contact_no,
      phone_no,
      website,
      trade_licenseno,
      max_companies,
      max_employess,
      max_asset,
      status,
      enabled_module
    } = req.body;

    // Check if client exists
    const checkQuery = 'SELECT id FROM client WHERE id = $1 AND isdelete = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found or has been deleted.' });
    }

    const queryText = `
      UPDATE client
      SET client_name = COALESCE($1, client_name),
          companyname = COALESCE($2, companyname),
          company_shortname = COALESCE($3, company_shortname),
          industry = COALESCE($4, industry),
          address = COALESCE($5, address),
          country = COALESCE($6, country),
          state = COALESCE($7, state),
          city = COALESCE($8, city),
          email = COALESCE($9, email),
          trn_no = COALESCE($10, trn_no),
          contact_no = COALESCE($11, contact_no),
          phone_no = COALESCE($12, phone_no),
          website = COALESCE($13, website),
          trade_licenseno = COALESCE($14, trade_licenseno),
          max_companies = COALESCE($15, max_companies),
          max_employess = COALESCE($16, max_employess),
          max_asset = COALESCE($17, max_asset),
          status = COALESCE($18, status),
          enabled_module = COALESCE($19, enabled_module),
          updatedat = CURRENT_TIMESTAMP
      WHERE id = $20 AND isdelete = false
      RETURNING *
    `;

    const result = await db.query(queryText, [
      client_name ? client_name.trim() : null,
      companyname ? companyname.trim() : null,
      company_shortname ? company_shortname.trim() : null,
      industry ? industry.trim() : null,
      address ? address.trim() : null,
      country ? country.trim() : null,
      state ? state.trim() : null,
      city ? city.trim() : null,
      email ? email.toLowerCase().trim() : null,
      trn_no ? BigInt(trn_no) : null,
      contact_no ? BigInt(contact_no) : null,
      phone_no ? BigInt(phone_no) : null,
      website ? website.trim() : null,
      trade_licenseno ? trade_licenseno.trim() : null,
      max_companies !== undefined ? parseInt(max_companies, 10) : null,
      max_employess !== undefined ? parseInt(max_employess, 10) : null,
      max_asset !== undefined ? parseInt(max_asset, 10) : null,
      status !== undefined ? parseInt(status, 10) : null,
      enabled_module ? enabled_module.trim() : null,
      id
    ]);

    // Format BigInt column fields for correct JSON representation
    const formattedClient = { ...result.rows[0] };
    if (formattedClient.trn_no) formattedClient.trn_no = formattedClient.trn_no.toString();
    if (formattedClient.contact_no) formattedClient.contact_no = formattedClient.contact_no.toString();
    if (formattedClient.phone_no) formattedClient.phone_no = formattedClient.phone_no.toString();

    res.status(200).json({
      message: 'Client updated successfully.',
      client: formattedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Internal Server Error while updating client.' });
  }
};

// @desc    Soft delete an existing client
// @route   DELETE /api/clients/:id
// @access  Public
exports.softDeleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const checkQuery = 'SELECT id FROM client WHERE id = $1 AND isdelete = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found or already deleted.' });
    }

    const deleteQuery = `
      UPDATE client
      SET isdelete = true,
          updatedat = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, client_name, isdelete
    `;
    const result = await db.query(deleteQuery, [id]);

    // Delete associated users to free up unique email constraint and allow re-registration
    await db.query('DELETE FROM users WHERE clientid = $1', [id]);

    // Soft-delete associated company records
    await db.query('UPDATE company SET is_deleted = true WHERE clientid = $1', [id]);

    res.status(200).json({
      message: 'Client deleted successfully (soft delete).',
      client: result.rows[0]
    });
  } catch (error) {
    console.error('Error soft-deleting client:', error);
    res.status(500).json({ message: 'Internal Server Error during client soft-deletion.' });
  }
};
