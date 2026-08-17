const express = require('express');
const router = express.Router();
const vehicleMaintenanceController = require('../controllers/vehicleMaintenanceController');

router.post('/', vehicleMaintenanceController.saveVehicleMaintenance);
router.get('/', vehicleMaintenanceController.getMaintenanceRecords);
router.put('/:id', vehicleMaintenanceController.updateMaintenance);
router.delete('/:id', vehicleMaintenanceController.deleteMaintenance);

module.exports = router;
