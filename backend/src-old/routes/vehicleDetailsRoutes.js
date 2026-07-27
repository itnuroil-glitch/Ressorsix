const express = require('express');
const router = express.Router();
const vehicleDetailsController = require('../controllers/vehicleDetailsController');
const checkDeletePermission = require('../utils/checkDeletePermission');

router.post('/', vehicleDetailsController.saveVehicleDetails);
router.get('/', vehicleDetailsController.getVehicleDetails);
router.put('/:id', vehicleDetailsController.updateVehicleDetails);
router.delete('/:id', checkDeletePermission('vehicle_details'), vehicleDetailsController.deleteVehicleDetails);

// GET vehicle chassis by client ID
router.get('/chassis-no/client', vehicleDetailsController.getVehicleChassisByClient);
router.get('/chassis-no/client/', vehicleDetailsController.getVehicleChassisByClient);
router.get('/chassis-no/client/:clientId', vehicleDetailsController.getVehicleChassisByClient);

// GET vehicle plates by client ID
router.get('/plate-no/client', vehicleDetailsController.getVehiclePlatesByClient);
router.get('/plate-no/client/', vehicleDetailsController.getVehiclePlatesByClient);
router.get('/plate-no/client/:clientId', vehicleDetailsController.getVehiclePlatesByClient);

// GET vehicles by client ID
router.get('/client', vehicleDetailsController.getVehiclesByClient);
router.get('/client/', vehicleDetailsController.getVehiclesByClient);
router.get('/client/:clientId', vehicleDetailsController.getVehiclesByClient);

module.exports = router;
