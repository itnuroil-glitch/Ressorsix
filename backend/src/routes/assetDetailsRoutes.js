const express = require('express');
const router = express.Router();
const assetDetailsController = require('../controllers/assetDetailsController');

// Dropdown API for Asset Selection
router.get('/dropdown', assetDetailsController.getAssetDropdownList);
router.get('/check-duplicate', assetDetailsController.checkDuplicateName);

router.post('/', assetDetailsController.saveAssetDetails);
router.get('/', assetDetailsController.getAssetDetails);
router.put('/:id', assetDetailsController.updateAssetDetails);
router.delete('/:id', assetDetailsController.deleteAssetDetails);

// GET asset departments by client ID
router.get('/department/client', assetDetailsController.getAssetDepartmentsByClient);
router.get('/department/client/', assetDetailsController.getAssetDepartmentsByClient);
router.get('/department/client/:clientId', assetDetailsController.getAssetDepartmentsByClient);

module.exports = router;
