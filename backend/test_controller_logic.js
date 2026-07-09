const { sendEmail } = require('./src/config/mailer');

async function test() {
  try {
    const clientid = 6;
    const email = 'vishnupriya@nurac.com';
    const full_name = 'gg';
    const tempPassword = 'testpassword123';

    console.log('Sending email using updated mailer logic...');
    await sendEmail({
      to: email,
      subject: 'Your New Employee Account Credentials',
      text: `Hello ${full_name},\n\nYour employee account has been created successfully.\n\nYour temporary login credentials are:\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in and update your password.\n\nBest regards,\nSystem Administrator`,
      clientid: clientid
    });
  } catch (err) {
    console.error('CRITICAL CONTROLLER SMTP ERROR:', err);
  } finally {
    process.exit(0);
  }
}

test();
