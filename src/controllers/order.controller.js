const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;
    
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cart is empty'
      });
    }
    
    // Check product availability
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      
      if (!product || product.status !== 'active') {
        return res.status(400).json({
          status: 'error',
          message: `Product ${item.name} is not available`
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({
          status: 'error',
          message: `Only ${product.stock} items of ${item.name} available`
        });
      }
    }
    
    // Calculate totals
    const subtotal = cart.totalPrice;
    const shippingFee = 0; // Gratuit pour l'exemple
    const tax = subtotal * 0.15; // 15% de taxe
    const discount = cart.coupon ? 
      (cart.coupon.discountType === 'percentage' ? 
        subtotal * (cart.coupon.discount / 100) : 
        cart.coupon.discount) : 0;
    const total = subtotal + shippingFee + tax - discount;
    
    // Create order
    const order = await Order.create({
      user: req.user.id,
      items: cart.items.map(item => ({
        product: item.product._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        color: item.color,
        size: item.size
      })),
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      notes,
      subtotal,
      shippingFee,
      tax,
      discount,
      total
    });
    
    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } }
      );
    }
    
    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { 
        items: [],
        coupon: undefined,
        totalItems: 0,
        totalPrice: 0
      }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating order',
      error: error.message
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort('-createdAt');
    
    res.json({
      status: 'success',
      data: { orders }
    });
  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('items.product', 'name images');
    
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }
    
    res.json({
      status: 'success',
      data: { order }
    });
  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// @desc    Update order status (admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber, notes } = req.body;
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }
    
    if (orderStatus) order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (notes) order.notes = notes;
    
    if (orderStatus === 'delivered') {
      order.deliveredAt = new Date();
    }
    
    if (orderStatus === 'cancelled') {
      order.cancelledAt = new Date();
      
      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
    }
    
    await order.save();
    
    res.json({
      status: 'success',
      message: 'Order status updated',
      data: { order }
    });
  } catch (error) {
    console.error('❌ Update order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating order',
      error: error.message
    });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders/all
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    const filter = {};
    if (status) filter.orderStatus = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Order.countDocuments(filter);
    
    res.json({
      status: 'success',
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get all orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { orderStatus: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);
    
    const recentOrders = await Order.find()
      .sort('-createdAt')
      .limit(5)
      .populate('user', 'name');
    
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          orderStatus: 'delivered',
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      status: 'success',
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus,
        recentOrders,
        monthlyRevenue
      }
    });
  } catch (error) {
    console.error('❌ Get order stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching order statistics',
      error: error.message
    });
  }
};
