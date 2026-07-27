const express = require('express');
const router = express.Router();
const premisesDetailsController = require('../controllers/premisesDetailsController');
const checkDeletePermission = require('../utils/checkDeletePermission');

router.post('/', premisesDetailsController.savePremisesDetails);
router.get('/', premisesDetailsController.getPremisesDetails);
router.put('/:id', premisesDetailsController.updatePremisesDetails);
router.delete('/:id', checkDeletePermission('premises_details'), premisesDetailsController.deletePremisesDetails);

// GET premises departments by client ID
router.get('/department/client', premisesDetailsController.getPremisesDepartmentsByClient);
router.get('/department/client/', premisesDetailsController.getPremisesDepartmentsByClient);
router.get('/department/client/:clientId', premisesDetailsController.getPremisesDepartmentsByClient);

module.exports = router;

