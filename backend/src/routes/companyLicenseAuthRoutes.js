const express = require('express');
const router = express.Router();
const companyLicenseAuthController = require('../controllers/companyLicenseAuthController');

router.get('/', companyLicenseAuthController.getAllCompanyLicenseAuth);
router.get('/:id', companyLicenseAuthController.getCompanyLicenseAuthById);
router.post('/', companyLicenseAuthController.createCompanyLicenseAuth);
router.put('/:id', companyLicenseAuthController.updateCompanyLicenseAuth);
router.delete('/:id', companyLicenseAuthController.deleteCompanyLicenseAuth);

module.exports = router;
