const { uploadToCloudinary } = require('../utils/cloudinary');

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private/Admin
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }
    
    const result = await uploadToCloudinary(req.file.buffer, 'escompany/uploads');
    
    res.json({
      status: 'success',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height
      }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading image',
      error: error.message
    });
  }
};

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private/Admin
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }
    
    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.buffer, 'escompany/uploads')
    );
    
    const results = await Promise.all(uploadPromises);
    
    const uploadedImages = results.map(result => ({
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    }));
    
    res.json({
      status: 'success',
      data: { images: uploadedImages }
    });
  } catch (error) {
    console.error('Upload multiple images error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading images',
      error: error.message
    });
  }
};
