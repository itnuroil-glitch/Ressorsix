const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');

// Country CRUD REST API Endpoints
router.get('/', countryController.getAllCountries);
router.post('/', countryController.createCountry);
router.put('/:id', countryController.updateCountry);
router.put('/:id/restore', countryController.restoreCountry);
router.delete('/:id', countryController.deleteCountry);

module.exports = router;
