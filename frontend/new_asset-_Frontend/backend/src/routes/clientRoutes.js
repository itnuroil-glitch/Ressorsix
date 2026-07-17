const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

// Client CRUD REST API Endpoints
router.get('/', clientController.getAllClients);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.softDeleteClient);

module.exports = router;
