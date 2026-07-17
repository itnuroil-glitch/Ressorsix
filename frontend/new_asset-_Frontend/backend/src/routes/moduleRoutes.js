const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');

// Module DDL CRUD REST API Endpoints
router.get('/', moduleController.getAllModules);
router.post('/', moduleController.createModule);
router.put('/:id', moduleController.updateModule);
router.delete('/:id', moduleController.softDeleteModule);

module.exports = router;
