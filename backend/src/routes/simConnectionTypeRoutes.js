const express = require('express');
const router = express.Router();
const simConnectionTypeController = require('../controllers/simConnectionTypeController');

router.get('/', simConnectionTypeController.getAllSimConnectionTypes);
router.post('/', simConnectionTypeController.createSimConnectionType);
router.put('/:id', simConnectionTypeController.updateSimConnectionType);
router.delete('/:id', simConnectionTypeController.deleteSimConnectionType);

module.exports = router;
