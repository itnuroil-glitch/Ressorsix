const express = require('express');
const router = express.Router();
const telecomProviderController = require('../controllers/telecomProviderController');

router.get('/', telecomProviderController.getAllTelecomProviders);
router.post('/', telecomProviderController.createTelecomProvider);
router.put('/:id', telecomProviderController.updateTelecomProvider);
router.delete('/:id', telecomProviderController.deleteTelecomProvider);

module.exports = router;
