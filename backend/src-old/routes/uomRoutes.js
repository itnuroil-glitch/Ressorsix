const express = require('express');
const router = express.Router();
const uomController = require('../controllers/uomController');

router.get('/', uomController.getAllUOMs);
router.post('/', uomController.createUOM);
router.put('/:id', uomController.updateUOM);
router.delete('/:id', uomController.deleteUOM);

module.exports = router;
