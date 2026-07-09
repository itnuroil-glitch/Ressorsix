const db = require('./src/config/db');
const nodemailer = require('nodemailer');

async function test() {
  try {
    const clientid = 6;
    const email = 'vishnupriya@nurac.com';
    const full_name = 'Anna';
    const tempPassword = 'testpassword123';

    // 1. Fetch SMTP config
    const smtpRes = await db.query(`
      SELECT s.* 
      FROM smtp_configuration s
      JOIN users u ON s.userid = u.id
      WHERE u.clientid = $1 
        AND s.is_deleted = false 
        AND s.status = 1 
      ORDER BY CASE WHEN u.roleid = 2 THEN 0 ELSE 1 END ASC, s.id ASC
      LIMIT 1
    `, [clientid]);

    if (smtpRes.rows.length === 0) {
      console.log('No SMTP configuration found in the DB!');
      return;
    }

    const smtpConfig = smtpRes.rows[0];

    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      secure: smtpConfig.smtp_port === 465,
      auth: { user: smtpConfig.smtp_usename, pass: smtpConfig.smtp_password },
      debug: true,
      logger: true
    });

    const mailOptions = {
      from: `"${smtpConfig.from_name || 'Trakio System'}" <${smtpConfig.from_email || smtpConfig.smtp_usename}>`,
      to: email,
      subject: `Welcome to the team, ${full_name}!`,
      text: `Hello ${full_name},\n\nWelcome to our team portal. Your account has been initialized.\n\nTo log in, please use the details below:\nPortal Login Email: ${email}\nSecurity Key: ${tempPassword}\n\nPlease remember to change your password upon your first login.\n\nWarm regards,\nTeam Support`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
          <h2 style="color: #0f172a;">Welcome to the team, ${full_name}!</h2>
          <p>Your user portal account has been successfully set up.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #475569;">Login Information:</p>
            <p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0 0 0;"><strong>One-time Passkey:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${tempPassword}</code></p>
          </div>
          <p style="color: #64748b; font-size: 13px;">For security reasons, you will be prompted to update this password upon your first sign-in.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">This is an automated security notification.</p>
        </div>
      `
    };

    console.log('Sending modified email to vishnupriya@nurac.com...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email successfully sent!', info);
  } catch (err) {
    console.error('SMTP ERROR DETAILS:', err);
  } finally {
    process.exit(0);
  }
}

test();
