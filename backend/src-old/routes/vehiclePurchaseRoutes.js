const express = require('express');
const router = express.Router();
const vehiclePurchaseController = require('../controllers/vehiclePurchaseController');
const checkDeletePermission = require('../utils/checkDeletePermission');

router.post('/', vehiclePurchaseController.saveVehiclePurchase);
router.get('/', vehiclePurchaseController.getVehiclePurchase);
router.put('/:id', vehiclePurchaseController.updateVehiclePurchase);
router.delete('/:id', checkDeletePermission('vehicle_purchase'), vehiclePurchaseController.deleteVehiclePurchase);

module.exports = router;
