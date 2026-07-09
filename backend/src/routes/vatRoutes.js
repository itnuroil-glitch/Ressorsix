const express = require('express');
const router = express.Router();
const vatController = require('../controllers/vatController');

router.get('/', vatController.getAllVats);
router.post('/', vatController.createVat);
router.put('/:id', vatController.updateVat);
router.delete('/:id', vatController.deleteVat);

module.exports = router;
