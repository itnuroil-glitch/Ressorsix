const db = require('./src/config/db');
const nodemailer = require('nodemailer');

async function test() {
  try {
    const clientid = 6;
    const email = 'vishnupriya@gmail.com';
    const full_name = 'madhav';
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
    console.log('Retrieved SMTP Config from database:', {
      id: smtpConfig.id,
      smtp_host: smtpConfig.smtp_host,
      smtp_port: smtpConfig.smtp_port,
      smtp_usename: smtpConfig.smtp_usename,
      from_email: smtpConfig.from_email,
      from_name: smtpConfig.from_name
    });

    // 2. Build transporter with debug/logger enabled to print raw communication
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      secure: smtpConfig.smtp_port === 465,
      auth: { user: smtpConfig.smtp_usename, pass: smtpConfig.smtp_password },
      debug: true,
      logger: true
    });

    const mailOptions = {
      from: `"${smtpConfig.from_name || 'System'}" <${smtpConfig.from_email || smtpConfig.smtp_usename}>`,
      to: email,
      subject: 'Your New Employee Account Credentials',
      text: `Hello ${full_name},\n\nYour employee account has been created successfully.\n\nYour temporary login credentials are:\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in and update your password.\n\nBest regards,\nSystem Administrator`
    };

    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email successfully sent!', info);
  } catch (err) {
    console.error('SMTP ERROR DETAILS:', err);
  } finally {
    process.exit(0);
  }
}

test();
