const express = require('express');
const router = express.Router();
const usageChargeController = require('../controllers/usageChargeController');

router.get('/', usageChargeController.getAllUsageCharges);
router.get('/:id', usageChargeController.getUsageChargeById);
router.post('/', usageChargeController.createUsageCharge);
router.put('/:id', usageChargeController.updateUsageCharge);
router.delete('/:id', usageChargeController.deleteUsageCharge);

module.exports = router;
