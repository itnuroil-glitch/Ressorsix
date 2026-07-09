const express = require('express');
const router = express.Router();
const PurchaseController = require('../controllers/PurchaseController');

router.get('/', PurchaseController.getAllPurchases);
router.post('/', PurchaseController.createPurchase);
router.get('/:id/assigned-quantities', PurchaseController.getPurchaseAssignedQuantities);
router.put('/:id', PurchaseController.updatePurchase);
router.delete('/:id', PurchaseController.deletePurchase);

module.exports = router;
