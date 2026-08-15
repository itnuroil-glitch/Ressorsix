const express = require('express');
const router = express.Router();
const tollTransactionController = require('../controllers/tollTransactionController');

router.post('/', tollTransactionController.saveTollTransaction);
router.get('/', tollTransactionController.getTollTransactionRecords);
router.put('/:id', tollTransactionController.updateTollTransaction);
router.delete('/:id', tollTransactionController.deleteTollTransaction);

module.exports = router;
