const express = require('express');
const router = express.Router();
const teleConnectionController = require('../controllers/teleConnectionController');

// Routes for Telecom Connections CRUD
router.get('/', teleConnectionController.getAllConnections);
router.get('/:id/assignments', teleConnectionController.getAssignmentHistory);
router.post('/:id/assign', teleConnectionController.assignConnection);
router.post('/:id/release', teleConnectionController.releaseConnection);
router.get('/:id', teleConnectionController.getConnectionById);
router.post('/', teleConnectionController.createConnection);
router.put('/:id', teleConnectionController.updateConnection);
router.delete('/:id', teleConnectionController.deleteConnection);

module.exports = router;
