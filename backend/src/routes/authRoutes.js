const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication API Endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', authController.changePassword);

module.exports = router;
