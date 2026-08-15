const express = require('express');
const router = express.Router();
const systemSettingController = require('../controllers/systemSettingController');

router.get('/', systemSettingController.getAllSettings);
router.get('/:key', systemSettingController.getSettingByKey);
router.post('/', systemSettingController.createSetting);
router.put('/:id', systemSettingController.updateSetting);
router.delete('/:id', systemSettingController.deleteSetting);

module.exports = router;
