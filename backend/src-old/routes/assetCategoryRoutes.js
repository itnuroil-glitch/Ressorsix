const express = require('express');
const router = express.Router();
const assetCategoryController = require('../controllers/assetCategoryController');

router.get('/', assetCategoryController.getAllAssetCategories);
router.get('/:parentId/subcategories', assetCategoryController.getSubcategoriesByParentId);
router.post('/', assetCategoryController.createAssetCategory);
router.put('/:id', assetCategoryController.updateAssetCategory);
router.delete('/:id', assetCategoryController.deleteAssetCategory);

module.exports = router;
