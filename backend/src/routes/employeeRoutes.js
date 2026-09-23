const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.route('/')
  .get(employeeController.getAllEmployees)
  .post(employeeController.createEmployee);

router.post('/bulk-import', employeeController.bulkImportEmployees);

router.get('/assigned-filter', employeeController.getEmployeesByClientAndCompany);
router.get('/base-company/:companyId', employeeController.getEmployeesByBaseCompany);
router.get('/base-company', employeeController.getEmployeesByBaseCompany);
router.get('/company-all/:companyId', employeeController.getEmployeesByCompanyAll);
router.get('/company-all', employeeController.getEmployeesByCompanyAll);
router.get('/company/:companyId', employeeController.getEmployeesByCompany);
router.get('/company', employeeController.getEmployeesByCompany);

router.route('/:id')
  .put(employeeController.updateEmployee)
  .delete(employeeController.deleteEmployee);

module.exports = router;
