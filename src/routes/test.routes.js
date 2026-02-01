const express = require('express');
const router = express.Router();
const { uploadImages } = require('../middleware/upload');

// Test route for upload
router.post('/test-upload', uploadImages, (req, res) => {
  try {
    console.log('📁 Files received:', req.files ? req.files.length : 0);
    console.log('📋 Body:', req.body);
    
    res.json({
      status: 'success',
      message: 'Upload test successful',
      data: {
        filesCount: req.files ? req.files.length : 0,
        body: req.body
      }
    });
  } catch (error) {
    console.error('❌ Test upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Test upload failed',
      error: error.message
    });
  }
});

module.exports = router;
