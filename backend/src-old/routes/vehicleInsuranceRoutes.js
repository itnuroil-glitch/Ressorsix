const express = require('express');
const router = express.Router();
const vehicleInsuranceController = require('../controllers/vehicleInsuranceController');
const checkDeletePermission = require('../utils/checkDeletePermission');

router.post('/', vehicleInsuranceController.saveVehicleInsurance);
router.get('/', vehicleInsuranceController.getVehicleInsurance);
router.put('/:id', vehicleInsuranceController.updateVehicleInsurance);
router.delete('/:id', checkDeletePermission('vehicle_insurance'), vehicleInsuranceController.deleteVehicleInsurance);

// GET vehicle policy numbers by client ID
router.get('/policy-no/client', vehicleInsuranceController.getVehiclePoliciesByClient);
router.get('/policy-no/client/', vehicleInsuranceController.getVehiclePoliciesByClient);
router.get('/policy-no/client/:clientId', vehicleInsuranceController.getVehiclePoliciesByClient);

module.exports = router;

