const express = require('express');
const router = express.Router();
const premisesTypeController = require('../controllers/premisesTypeController');

// Premises Type CRUD REST API Endpoints
router.get('/', premisesTypeController.getAllPremisesTypes);
router.post('/', premisesTypeController.createPremisesType);
router.put('/:id', premisesTypeController.updatePremisesType);
router.delete('/:id', premisesTypeController.deletePremisesType);

module.exports = router;
