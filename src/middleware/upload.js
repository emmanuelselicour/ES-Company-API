const multer = require('multer');
const path = require('path');

// Configure storage - utiliser memory storage pour Render
const storage = multer.memoryStorage();

// File filter plus permissif pour le développement
const fileFilter = (req, file, cb) => {
  // Accepter toutes les images
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    // Pour le développement, accepter aussi d'autres types
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ Accepting file type in development: ${file.mimetype}`);
      return cb(null, true);
    }
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only images are allowed.`));
  }
};

// Configure upload avec des limites raisonnables
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (plus grand pour le développement)
    files: 5 // Max 5 fichiers
  },
  fileFilter: fileFilter
});

// Middleware pour gérer les erreurs d'upload
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum is 5 files.'
      });
    }
  } else if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message || 'File upload error'
    });
  }
  next();
};

// Multiple file upload middleware
const uploadImages = (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
};

// Single file upload middleware
const uploadSingleImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
};

module.exports = { uploadImages, uploadSingleImage, handleUploadError };
