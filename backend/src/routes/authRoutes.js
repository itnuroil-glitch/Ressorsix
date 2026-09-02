const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const oidcController = require('../controllers/oidcController');
const approvalController = require('../controllers/approvalController');
const authMiddleware = require('../middleware/authMiddleware');

// Rate limiting for login & approval endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

// OIDC Authentik SSO Routes
router.get('/login', authLimiter, oidcController.login);
router.get('/callback', authLimiter, oidcController.callback);
router.get('/me', authMiddleware, oidcController.me);
router.all('/logout', oidcController.logout);

// OrbisHub Mobile Push-Approval Routes
router.post('/approval/start', authLimiter, approvalController.startApproval);
router.get('/approval/status/:challengeId', approvalController.checkStatus);
router.post('/approval/verify', authLimiter, approvalController.verifyApprovalToken);

// Legacy Authentication Endpoints (disabled/restricted when SSO active)
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/admin-change-password', authMiddleware, authController.adminChangePassword);

module.exports = router;
