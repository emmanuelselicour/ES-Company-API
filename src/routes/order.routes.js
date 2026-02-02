const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderStats
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth');

// User routes
router.use(protect);

router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrder);

// Admin routes
router.use(authorize('admin'));

router.get('/admin/all', getAllOrders);
router.get('/admin/stats', getOrderStats);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
