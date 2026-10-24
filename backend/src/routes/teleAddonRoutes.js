const express = require('express');
const router = express.Router();
const teleAddonController = require('../controllers/teleAddonController');

router.get('/', teleAddonController.getAllTeleAddons);
router.post('/', teleAddonController.createTeleAddon);
router.put('/:id', teleAddonController.updateTeleAddon);
router.delete('/:id', teleAddonController.deleteTeleAddon);

module.exports = router;

