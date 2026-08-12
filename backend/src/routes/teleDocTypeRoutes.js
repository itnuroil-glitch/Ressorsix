const express = require('express');
const router = express.Router();
const teleDocTypeController = require('../controllers/teleDocTypeController');

router.get('/', teleDocTypeController.getAllTeleDocTypes);
router.get('/:id', teleDocTypeController.getTeleDocTypeById);
router.post('/', teleDocTypeController.createTeleDocType);
router.put('/:id', teleDocTypeController.updateTeleDocType);
router.delete('/:id', teleDocTypeController.deleteTeleDocType);

module.exports = router;
