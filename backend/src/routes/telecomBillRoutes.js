const express = require('express');
const router = express.Router();
const telecomBillController = require('../controllers/telecomBillController');

router.get('/', telecomBillController.getAllTelecomBills);
router.get('/:id', telecomBillController.getTelecomBillById);
router.post('/', telecomBillController.createTelecomBill);
router.put('/:id', telecomBillController.updateTelecomBill);
router.delete('/:id', telecomBillController.deleteTelecomBill);

module.exports = router;
