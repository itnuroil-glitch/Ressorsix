const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// GET all companies
router.get('/', companyController.getAllCompanies);

// POST new company
router.post('/', companyController.createCompany);

// PUT update company
router.put('/:id', companyController.updateCompany);

// DELETE company
router.delete('/:id', companyController.deleteCompany);

// GET companies by client ID
router.get('/client', companyController.getCompaniesByClient);
router.get('/client/', companyController.getCompaniesByClient);
router.get('/client/:clientId', companyController.getCompaniesByClient);

module.exports = router;
