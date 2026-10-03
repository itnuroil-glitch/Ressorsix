const express = require('express');
const router = express.Router();
const auditHistoryController = require('../controllers/auditHistoryController');

router.get('/', auditHistoryController.getAuditHistory);
router.post('/', auditHistoryController.recordAuditEntry);

module.exports = router;
