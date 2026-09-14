const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = require('../utils/uploader');

// Base upload directory
const uploadDir = path.join(__dirname, '../../upload');
const tempDir = path.join(uploadDir, 'temp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Temporary chunk storage
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawFileId = req.query.fileId || req.body.fileId || '';
    const fileId = rawFileId ? rawFileId.replace(/[^a-zA-Z0-9_-]/g, '') : 'default_upload';
    const sessionDir = path.join(tempDir, fileId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    const chunkIndex = (req.query.chunkIndex !== undefined && req.query.chunkIndex !== '')
      ? req.query.chunkIndex
      : (req.body.chunkIndex !== undefined ? req.body.chunkIndex : '0');
    cb(null, `chunk_${chunkIndex}`);
  }
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per chunk (individual chunks are ~512KB)
});

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

// POST /api/upload/chunk - Chunked file upload (512KB pieces to bypass Nginx 1MB limits)
router.post('/chunk', chunkUpload.single('chunk'), async (req, res) => {
  try {
    const fileId = req.query.fileId || req.body.fileId;
    const chunkIndex = req.query.chunkIndex !== undefined ? req.query.chunkIndex : req.body.chunkIndex;
    const totalChunks = req.query.totalChunks || req.body.totalChunks;
    const fileName = req.query.fileName || req.body.fileName;

    if (!fileId || chunkIndex === undefined || !totalChunks) {
      return res.status(400).json({ message: 'Missing chunk metadata (fileId, chunkIndex, totalChunks)' });
    }

    const currentIdx = parseInt(chunkIndex, 10);
    const total = parseInt(totalChunks, 10);
    const sanitizedFileId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
    const sessionDir = path.join(tempDir, sanitizedFileId);

    // If this is the last chunk, merge all chunks together
    if (currentIdx === total - 1) {
      const sanitizedName = (fileName ? fileName.replace(/\s+/g, '_') : 'uploaded_file');
      const uniqueName = `${Date.now()}-${sanitizedName}`;
      const finalFilePath = path.join(uploadDir, uniqueName);
      const writeStream = fs.createWriteStream(finalFilePath);

      for (let i = 0; i < total; i++) {
        const chunkFilePath = path.join(sessionDir, `chunk_${i}`);
        if (fs.existsSync(chunkFilePath)) {
          const chunkBuffer = fs.readFileSync(chunkFilePath);
          writeStream.write(chunkBuffer);
        } else {
          writeStream.close();
          return res.status(400).json({ message: `Missing chunk ${i} during reassembly` });
        }
      }

      writeStream.end();

      // Clean up temporary chunk files
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.warn('Could not clean up temp upload directory:', rmErr.message);
      }

      return res.status(200).json({
        success: true,
        completed: true,
        message: 'File reassembled successfully',
        filePath: `upload/${uniqueName}`,
        fileName: fileName
      });
    }

    // Chunk saved, awaiting more chunks
    return res.status(200).json({
      success: true,
      completed: false,
      chunkIndex: currentIdx,
      totalChunks: total
    });
  } catch (err) {
    console.error('Error handling chunk upload:', err);
    return res.status(500).json({ message: 'Server error during chunk upload', error: err.message });
  }
});

module.exports = router;
