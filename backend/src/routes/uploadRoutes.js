const express = require('express');
const router = express.Router();
const upload = require('../utils/uploader');

// POST /api/upload - Single file upload
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const relativePath = `upload/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      filePath: relativePath,
      fileName: req.file.originalname
    });
  } catch (err) {
    console.error('Error handling file upload:', err);
    return res.status(500).json({ message: 'Server error during file upload', error: err.message });
  }
});

module.exports = router;
