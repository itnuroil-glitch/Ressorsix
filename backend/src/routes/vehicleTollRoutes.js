const express = require('express');
const router = express.Router();
const vehicleTollController = require('../controllers/vehicleTollController');

router.post('/', vehicleTollController.saveVehicleToll);
router.get('/', vehicleTollController.getVehicleTolls);
router.put('/:id', vehicleTollController.updateVehicleToll);
router.delete('/:id', vehicleTollController.deleteVehicleToll);

module.exports = router;
