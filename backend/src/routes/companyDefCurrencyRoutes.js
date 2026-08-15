const express = require('express');
const router = express.Router();
const companyDefCurrencyController = require('../controllers/companyDefCurrencyController');

router.get('/', companyDefCurrencyController.getAllCompanyDefCurrency);
router.get('/:id', companyDefCurrencyController.getCompanyDefCurrencyById);
router.post('/', companyDefCurrencyController.createCompanyDefCurrency);
router.put('/:id', companyDefCurrencyController.updateCompanyDefCurrency);
router.delete('/:id', companyDefCurrencyController.deleteCompanyDefCurrency);

module.exports = router;
