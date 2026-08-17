const express = require('express');
const router = express.Router();
const serviceDetailsController = require('../controllers/serviceDetailsController');

router.post('/', serviceDetailsController.saveServiceDetail);
router.get('/', serviceDetailsController.getServiceDetails);
router.get('/client/:clientid', serviceDetailsController.getServiceDetailsByClient);
router.get('/client', serviceDetailsController.getServiceDetails);
router.put('/:id', serviceDetailsController.updateServiceDetail);
router.delete('/:id', serviceDetailsController.deleteServiceDetail);

module.exports = router;
