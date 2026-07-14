const express = require('express');
const router = express.Router();
const fieldPermissionController = require('../controllers/fieldPermissionController');

router.get('/', fieldPermissionController.getAllFieldPermissions);
router.get('/config', fieldPermissionController.getFieldPermission);
router.get('/:id', fieldPermissionController.getFieldPermission);
router.post('/', fieldPermissionController.createOrUpdateFieldPermission);
router.put('/:id', fieldPermissionController.createOrUpdateFieldPermission);
router.delete('/:id', fieldPermissionController.deleteFieldPermission);

module.exports = router;
