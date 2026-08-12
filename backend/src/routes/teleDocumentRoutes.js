const express = require('express');
const router = express.Router();
const teleDocumentController = require('../controllers/teleDocumentController');

router.get('/', teleDocumentController.getAllTeleDocuments);
router.get('/:id', teleDocumentController.getTeleDocumentById);
router.post('/', teleDocumentController.createTeleDocument);
router.put('/:id', teleDocumentController.updateTeleDocument);
router.delete('/:id', teleDocumentController.deleteTeleDocument);

module.exports = router;
