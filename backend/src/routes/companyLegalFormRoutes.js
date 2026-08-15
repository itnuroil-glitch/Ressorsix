const express = require('express');
const router = express.Router();
const companyLegalFormController = require('../controllers/companyLegalFormController');

router.get('/', companyLegalFormController.getAllCompanyLegalForms);
router.get('/:id', companyLegalFormController.getCompanyLegalFormById);
router.post('/', companyLegalFormController.createCompanyLegalForm);
router.put('/:id', companyLegalFormController.updateCompanyLegalForm);
router.delete('/:id', companyLegalFormController.deleteCompanyLegalForm);

module.exports = router;
