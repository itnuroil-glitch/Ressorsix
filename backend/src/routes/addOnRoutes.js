const express = require('express');
const router = express.Router();
const addOnController = require('../controllers/addOnController');

router.get('/', addOnController.getAllAddOns);
router.get('/:id', addOnController.getAddOnById);
router.post('/', addOnController.createAddOn);
router.put('/:id', addOnController.updateAddOn);
router.delete('/:id', addOnController.deleteAddOn);

module.exports = router;
