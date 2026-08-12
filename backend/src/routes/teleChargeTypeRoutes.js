const express = require('express');
const router = express.Router();
const teleChargeTypeController = require('../controllers/teleChargeTypeController');

router.get('/', teleChargeTypeController.getAllTeleChargeTypes);
router.get('/:id', teleChargeTypeController.getTeleChargeTypeById);
router.post('/', teleChargeTypeController.createTeleChargeType);
router.put('/:id', teleChargeTypeController.updateTeleChargeType);
router.delete('/:id', teleChargeTypeController.deleteTeleChargeType);

module.exports = router;
