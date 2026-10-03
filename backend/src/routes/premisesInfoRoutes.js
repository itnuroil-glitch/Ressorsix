const express = require('express');
const router = express.Router();
const premisesInfoController = require('../controllers/premisesInfoController');

// Premise code auto-generator
router.get('/next-code', premisesInfoController.getNextPremiseCode);

// Premises Info CRUD routes
router.get('/', premisesInfoController.getAllPremises);
router.get('/:id', premisesInfoController.getPremiseById);
router.post('/', premisesInfoController.createPremise);
router.put('/:id', premisesInfoController.updatePremise);
router.delete('/:id', premisesInfoController.deletePremise);

module.exports = router;
