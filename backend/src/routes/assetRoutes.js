const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
//const testBrokenVariable = ;
router.get('/', assetController.getAllAssets);

module.exports = router;
