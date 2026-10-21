const express = require('express');
const router = express.Router();
const telePackageController = require('../controllers/telePackageController');

router.get('/', telePackageController.getAllTelePackages);
router.post('/import-from-connections', telePackageController.importFromConnections);
router.get('/:id', telePackageController.getTelePackageById);
router.post('/', telePackageController.createTelePackage);
router.put('/:id', telePackageController.updateTelePackage);
router.delete('/:id', telePackageController.deleteTelePackage);

module.exports = router;
