const express = require('express');
const router = express.Router();
const teleServiceProviderController = require('../controllers/teleServiceProviderController');

router.get('/', teleServiceProviderController.getAllTeleServiceProviders);
router.post('/', teleServiceProviderController.createTeleServiceProvider);
router.put('/:id', teleServiceProviderController.updateTeleServiceProvider);
router.delete('/:id', teleServiceProviderController.deleteTeleServiceProvider);

module.exports = router;
