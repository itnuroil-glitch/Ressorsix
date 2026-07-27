const express = require('express');
const router = express.Router();
const assetOpeningController = require('../controllers/assetOpeningController');

// Add stock items
router.post('/', assetOpeningController.addAssetOpening);

// Get all barcodes for dropdowns
router.get('/all-barcodes', assetOpeningController.getAllBarcodes);

// Get stock items for an asset
router.get('/:asset_id', assetOpeningController.getAssetOpening);

module.exports = router;
