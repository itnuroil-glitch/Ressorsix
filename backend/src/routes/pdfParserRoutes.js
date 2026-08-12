const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParserController = require('../controllers/pdfParserController');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.post('/parse-pdf', upload.single('pdf'), pdfParserController.parsePdfDocument);

module.exports = router;
