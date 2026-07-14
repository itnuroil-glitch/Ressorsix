const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');

// GET states by country ID
router.get('/country', stateController.getStatesByCountry);
router.get('/country/', stateController.getStatesByCountry);
router.get('/country/:countryId', stateController.getStatesByCountry);

// State CRUD REST API Endpoints
router.get('/', stateController.getAllStates);
router.post('/', stateController.createState);
router.put('/:id', stateController.updateState);
router.delete('/:id', stateController.deleteState);

module.exports = router;
