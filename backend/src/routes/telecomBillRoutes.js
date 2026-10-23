const express = require('express');
const router = express.Router();
const telecomBillController = require('../controllers/telecomBillController');
const teleUsageReportController = require('../controllers/teleUsageReportController');

router.get('/', telecomBillController.getAllTelecomBills);
router.get('/usage-report/options', teleUsageReportController.getUsageReportOptions);
router.get('/usage-report', teleUsageReportController.getUsageReport);
router.post('/usage-report/pdf', teleUsageReportController.downloadUsageReportPdf);
router.get('/report-analytics', telecomBillController.getTelecomReportAnalytics);
router.get('/test-report', telecomBillController.getTelecomTestAuditReport);
router.get('/:id', telecomBillController.getTelecomBillById);
router.get('/:id/call-logs', telecomBillController.getCallLogsByBillId);
router.post('/', telecomBillController.createTelecomBill);
router.put('/:id', telecomBillController.updateTelecomBill);
router.delete('/:id', telecomBillController.deleteTelecomBill);
router.get('/:id/logs', telecomBillController.getTelecomBillLogs);

module.exports = router;
