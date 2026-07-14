const express = require('express');
const router = express.Router();
const vehicleInsuranceController = require('../controllers/vehicleInsuranceController');

router.post('/', vehicleInsuranceController.saveVehicleInsurance);
router.get('/', vehicleInsuranceController.getVehicleInsurance);
router.put('/:id', vehicleInsuranceController.updateVehicleInsurance);
router.delete('/:id', vehicleInsuranceController.deleteVehicleInsurance);

module.exports = router;
