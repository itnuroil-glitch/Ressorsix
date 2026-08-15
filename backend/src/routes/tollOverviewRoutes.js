const express = require('express');
const router = express.Router();
const tollOverviewController = require('../controllers/tollOverviewController');

router.post('/', tollOverviewController.saveTollOverview);
router.get('/', tollOverviewController.getTollOverviewRecords);
router.put('/:id', tollOverviewController.updateTollOverview);
router.delete('/:id', tollOverviewController.deleteTollOverview);

module.exports = router;
