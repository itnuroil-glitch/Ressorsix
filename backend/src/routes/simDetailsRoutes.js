const express = require('express');
const router = express.Router();
const simDetailsController = require('../controllers/simDetailsController');

router.get('/', simDetailsController.getAllSimDetails);
router.get('/:id', simDetailsController.getSimDetailById);
router.post('/', simDetailsController.createSimDetail);
router.put('/:id', simDetailsController.updateSimDetail);
router.delete('/:id', simDetailsController.deleteSimDetail);

module.exports = router;
