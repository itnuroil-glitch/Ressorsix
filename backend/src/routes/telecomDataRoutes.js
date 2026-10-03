const express = require('express');
const router = express.Router();
const telecomDataController = require('../controllers/telecomDataController');

router.get('/', telecomDataController.getAllTelecomData);
router.get('/logs/all', telecomDataController.getAllTelecomLogs);
router.get('/:id/logs', telecomDataController.getTelecomLogs);
router.get('/:id', telecomDataController.getTelecomDataById);
router.post('/', telecomDataController.createTelecomData);
router.put('/:id', telecomDataController.updateTelecomData);
router.delete('/:id', telecomDataController.deleteTelecomData);

module.exports = router;
