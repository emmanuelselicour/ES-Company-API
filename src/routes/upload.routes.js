const express = require('express');
const router = express.Router();
const { 
  uploadImage, 
  uploadMultipleImages 
} = require('../controllers/upload.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingleImage, uploadImages } = require('../middleware/upload');

// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

router.post('/', uploadSingleImage, uploadImage);
router.post('/multiple', uploadImages, uploadMultipleImages);

module.exports = router;
