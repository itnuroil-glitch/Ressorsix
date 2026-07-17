const express = require('express');
const router = express.Router();
const vehiclePurchaseController = require('../controllers/vehiclePurchaseController');

router.post('/', vehiclePurchaseController.saveVehiclePurchase);
router.get('/', vehiclePurchaseController.getVehiclePurchase);
router.put('/:id', vehiclePurchaseController.updateVehiclePurchase);
router.delete('/:id', vehiclePurchaseController.deleteVehiclePurchase);

module.exports = router;
