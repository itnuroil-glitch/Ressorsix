const express = require('express');
const router = express.Router();
const customFieldController = require('../controllers/customFieldController');

router.get('/', customFieldController.getAllCustomFields);
router.get('/permissioned-fields', customFieldController.getPermissionedCustomFields);
router.get('/module/:moduleId', customFieldController.getCustomFieldsByModule);
router.get('/:id/field-values', customFieldController.getFieldValues);
router.post('/', customFieldController.createCustomField);
router.put('/:id', customFieldController.updateCustomField);
router.delete('/:id', customFieldController.deleteCustomField);

module.exports = router;
