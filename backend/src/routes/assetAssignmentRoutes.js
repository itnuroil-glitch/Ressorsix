const express = require('express');
const router = express.Router();
const assetAssignmentController = require('../controllers/assetAssignmentController');

router.post('/', assetAssignmentController.saveAssetAssignment);
router.get('/', assetAssignmentController.getAssetAssignments);
router.put('/:id', assetAssignmentController.updateAssetAssignment);
router.delete('/:id', assetAssignmentController.deleteAssetAssignment);

module.exports = router;
