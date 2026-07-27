const express = require('express');
const router = express.Router();
const assetBrandController = require('../controllers/assetBrandController');

router.get('/', assetBrandController.getAllAssetBrands);
router.post('/', assetBrandController.createAssetBrand);
router.put('/:id', assetBrandController.updateAssetBrand);
router.delete('/:id', assetBrandController.deleteAssetBrand);

module.exports = router;
