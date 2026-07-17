const express = require('express');
const router = express.Router({ mergeParams: true });
const permissionController = require('../controllers/permissionController');

router.route('/')
  .get(permissionController.getRolePermissions)
  .post(permissionController.saveRolePermissions);

module.exports = router;
