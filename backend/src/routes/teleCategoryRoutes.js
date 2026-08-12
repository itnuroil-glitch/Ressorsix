const express = require('express');
const router = express.Router();
const teleCategoryController = require('../controllers/teleCategoryController');

router.get('/', teleCategoryController.getAllTeleCategories);
router.get('/:id', teleCategoryController.getTeleCategoryById);
router.post('/', teleCategoryController.createTeleCategory);
router.put('/:id', teleCategoryController.updateTeleCategory);
router.delete('/:id', teleCategoryController.deleteTeleCategory);

module.exports = router;
