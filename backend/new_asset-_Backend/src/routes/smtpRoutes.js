const express = require('express');
const router = express.Router();
const smtpController = require('../controllers/smtpController');

// Define REST routes for SMTP Configuration management
router.get('/', smtpController.getAllSmtp);
router.post('/', smtpController.createSmtp);
router.put('/:id', smtpController.updateSmtp);
router.delete('/:id', smtpController.deleteSmtp);

module.exports = router;
