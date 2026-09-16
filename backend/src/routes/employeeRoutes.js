const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');

router.route('/')
  .get(employeeController.getAllEmployees)
  .post(employeeController.createEmployee);

router.get('/import-template-options', authMiddleware, employeeController.getImportTemplateOptions);
router.post('/bulk-import', employeeController.bulkImportEmployees);

router.get('/base-company/:companyId', employeeController.getEmployeesByBaseCompany);
router.get('/base-company', employeeController.getEmployeesByBaseCompany);
router.get('/company/:companyId', employeeController.getEmployeesByCompany);
router.get('/company', employeeController.getEmployeesByCompany);

router.route('/:id')
  .put(employeeController.updateEmployee)
  .delete(employeeController.deleteEmployee);

module.exports = router;
