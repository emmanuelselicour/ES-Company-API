const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getFeaturedProducts,
  getProductsByCategory
} = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);

// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getProductStats);
router.post('/', uploadImages, createProduct);
router.put('/:id', uploadImages, updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
