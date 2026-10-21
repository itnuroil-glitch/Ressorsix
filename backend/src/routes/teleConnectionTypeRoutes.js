const express = require('express');
const router = express.Router();
const teleConnectionTypeController = require('../controllers/teleConnectionTypeController');

router.get('/', teleConnectionTypeController.getAllTeleConnectionTypes);
router.post('/', teleConnectionTypeController.createTeleConnectionType);
router.put('/:id', teleConnectionTypeController.updateTeleConnectionType);
router.delete('/:id', teleConnectionTypeController.deleteTeleConnectionType);

module.exports = router;
