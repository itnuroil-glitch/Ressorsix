const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.route('/')
  .get(employeeController.getAllEmployees)
  .post(employeeController.createEmployee);

router.post('/bulk-import', employeeController.bulkImportEmployees);

router.get('/company/:companyId', employeeController.getEmployeesByCompany);
router.get('/company', employeeController.getEmployeesByCompany);

router.route('/:id')
  .put(employeeController.updateEmployee)
  .delete(employeeController.deleteEmployee);

module.exports = router;
