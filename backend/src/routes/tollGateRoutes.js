const express = require('express');
const router = express.Router();
const tollGateController = require('../controllers/tollGateController');

router.get('/', tollGateController.getAllTollGates);
router.get('/:id', tollGateController.getTollGateById);
router.post('/', tollGateController.createTollGate);
router.put('/:id', tollGateController.updateTollGate);
router.delete('/:id', tollGateController.deleteTollGate);

module.exports = router;
