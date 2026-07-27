const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

router.route('/')
  .get(roleController.getAllRoles)
  .post(roleController.createRole);

router.route('/:id')
  .put(roleController.updateRole)
  .delete(roleController.softDeleteRole);

module.exports = router;
