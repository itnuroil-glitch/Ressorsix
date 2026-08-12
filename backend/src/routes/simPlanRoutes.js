const express = require('express');
const router = express.Router();
const simPlanController = require('../controllers/simPlanController');

router.get('/', simPlanController.getAllSimPlans);
router.post('/', simPlanController.createSimPlan);
router.put('/:id', simPlanController.updateSimPlan);
router.delete('/:id', simPlanController.deleteSimPlan);

module.exports = router;
