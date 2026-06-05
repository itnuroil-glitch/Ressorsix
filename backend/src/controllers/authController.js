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

    // Hash new password
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
