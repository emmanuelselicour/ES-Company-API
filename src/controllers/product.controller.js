const Product = require('../models/Product');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      status = 'active',
      sort = '-createdAt',
      search
    } = req.query;
    
    // Build filter
    const filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Product.countDocuments(filter);
    
    res.json({
      status: 'success',
      data: {
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    res.json({
      status: 'success',
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      status = 'active',
      featured = false,
      discount = 0,
      specifications
    } = req.body;
    
    // Handle images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        images.push({
          url: result.secure_url,
          public_id: result.public_id,
          alt: name
        });
      }
    }
    
    // Create product
    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      status,
      featured,
      discount: Number(discount),
      specifications: specifications ? JSON.parse(specifications) : {},
      images
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating product',
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    // Update basic fields
    const updatableFields = [
      'name', 'description', 'price', 'category', 
      'stock', 'status', 'featured', 'discount', 'specifications'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'specifications' && typeof req.body[field] === 'string') {
          product[field] = JSON.parse(req.body[field]);
        } else {
          product[field] = req.body[field];
        }
      }
    });
    
    // Handle new images if provided
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          if (image.public_id) {
            await deleteFromCloudinary(image.public_id);
          }
        }
      }
      
      // Upload new images
      const newImages = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        newImages.push({
          url: result.secure_url,
          public_id: result.public_id,
          alt: req.body.name || product.name
        });
      }
      
      product.images = newImages;
    }
    
    // Handle image removal if specified
    if (req.body.removedImages) {
      const removedIds = JSON.parse(req.body.removedImages);
      product.images = product.images.filter(img => !removedIds.includes(img.public_id));
      
      // Delete from Cloudinary
      for (const publicId of removedIds) {
        await deleteFromCloudinary(publicId);
      }
    }
    
    await product.save();
    
    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating product',
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.public_id) {
          await deleteFromCloudinary(image.public_id);
        }
      }
    }
    
    // Delete product from database
    await product.deleteOne();
    
    res.json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Private/Admin
exports.getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const outOfStockProducts = await Product.countDocuments({ status: 'out_of_stock' });
    
    // Get total inventory value
    const inventoryStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
          averagePrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);
    
    // Get products by category
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get low stock products (less than 5)
    const lowStockProducts = await Product.countDocuments({ stock: { $lt: 5 }, stock: { $gt: 0 } });
    
    res.json({
      status: 'success',
      data: {
        totalProducts,
        activeProducts,
        outOfStockProducts,
        lowStockProducts,
        inventoryValue: inventoryStats[0]?.totalValue || 0,
        averagePrice: inventoryStats[0]?.averagePrice || 0,
        minPrice: inventoryStats[0]?.minPrice || 0,
        maxPrice: inventoryStats[0]?.maxPrice || 0,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching product statistics',
      error: error.message
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ featured: true, status: 'active' })
      .limit(8)
      .sort('-createdAt');
    
    res.json({
      status: 'success',
      data: { products }
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching featured products',
      error: error.message
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 12 } = req.query;
    
    const products = await Product.find({ 
      category, 
      status: 'active' 
    })
    .limit(Number(limit))
    .sort('-createdAt');
    
    res.json({
      status: 'success',
      data: { products }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching products by category',
      error: error.message
    });
  }
};
