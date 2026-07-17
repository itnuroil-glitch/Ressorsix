const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Email regex helper
const validateEmail = (email) => {
  const emailRegex = /\S+@\S+\.\S+/;
  return emailRegex.test(email);
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // 2. Check if user already exists
    const userExistQuery = 'SELECT id FROM users WHERE email = $1';
    const userExistResult = await db.query(userExistQuery, [email.toLowerCase().trim()]);

    if (userExistResult.rows.length > 0) {
      return res.status(400).json({ message: 'This email is already registered.' });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Insert user into the database
    const insertUserQuery = `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING id, email, roleid, created_at
    `;
    const newUserResult = await db.query(insertUserQuery, [
      email.toLowerCase().trim(),
      hashedPassword,
    ]);

    const newUser = newUserResult.rows[0];

    // 5. Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Return response
    // Parse Name for dashboard preview
    const name = newUser.email.split('@')[0]
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: name,
        roleId: newUser.roleid,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error in user registration:', error);
    res.status(500).json({ message: 'Internal Server Error during registration.' });
  }
};

// @desc    Authenticate user and login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    // 2. Find user in database
    const findUserQuery = 'SELECT id, email, password, roleid, clientid, companyid, created_at FROM users WHERE email = $1';
    const userResult = await db.query(findUserQuery, [email.toLowerCase().trim()]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const user = userResult.rows[0];

    // 3. Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password mismatch.' });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Parse Name for dashboard preview
    const name = user.email.split('@')[0]
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    res.status(200).json({
      message: 'Sign in successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: name,
        roleId: user.roleid,
        clientid: user.clientid,
        companyid: user.companyid,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error in user login:', error);
    res.status(500).json({ message: 'Internal Server Error during sign in.' });
  }
};

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Public (Expects userId in body)
exports.changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide user ID, current password, and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    // Find user
    const findUserQuery = 'SELECT password FROM users WHERE id = $1';
    const userResult = await db.query(findUserQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    const updatePasswordQuery = 'UPDATE users SET password = $1 WHERE id = $2';
    await db.query(updatePasswordQuery, [hashedPassword, userId]);

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal Server Error during password change.' });
  }
};

// @desc    Admin change password for an employee user
// @route   POST /api/auth/admin-change-password
// @access  Private (Admin/Client Admin)
exports.adminChangePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Please provide user email and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in users table
    const updatePasswordQuery = 'UPDATE users SET password = $1 WHERE email = $2';
    const result = await db.query(updatePasswordQuery, [hashedPassword, email.toLowerCase().trim()]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User account not found for this email.' });
    }

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error changing employee password:', error);
    res.status(500).json({ message: 'Internal Server Error during admin password change.' });
  }
};

// @desc    Forgot password - reset and email temporary password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide email address.' });
    }

    // Check if user exists in database
    const findUserQuery = 'SELECT id, email FROM users WHERE email = $1 AND isdelete = false';
    const userResult = await db.query(findUserQuery, [email.toLowerCase().trim()]);

    if (userResult.rows.length === 0) {
      // Return 200 generic message even if user not found to prevent user harvesting
      return res.status(200).json({ message: 'If the email exists, a password reset has been sent.' });
    }

    // Generate secure 10 character temporary password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Save temporary password to database
    const updatePasswordQuery = 'UPDATE users SET password = $1 WHERE email = $2';
    await db.query(updatePasswordQuery, [hashedPassword, email.toLowerCase().trim()]);

    // Send password reset email
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
        subject: 'Reset Password - Trakio Logistics Platform',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #ef4444; margin: 0;">Password Reset Request</h2>
            </div>
            <p>Hello,</p>
            <p>You are receiving this email because we received a password reset request for your Trakio account.</p>
            <p>Below is your new temporary login password:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444; text-align: center;">
              <code style="font-size: 20px; color: #e11d48; font-weight: bold; letter-spacing: 1px;">${tempPassword}</code>
            </div>
            <p style="color: #64748b; font-size: 13px;"><em>For security, please log in and change your password immediately in the settings tab.</em></p>
            <p style="margin-top: 30px;">Best regards,<br><strong>Trakio Support Team</strong></p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('Successfully sent reset password email to:', email);
      } catch (mailErr) {
        console.error('Failed to send reset password email:', mailErr);
      }
    } else {
      console.warn('No active SMTP configurations found. Reset email was not sent.');
    }

    res.status(200).json({ message: 'If the email exists, a password reset has been sent.' });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ message: 'Internal Server Error during password reset.' });
  }
};

