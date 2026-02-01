const Product = require('../models/Product');

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
    console.error('❌ Get products error:', error);
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
    console.error('❌ Get product error:', error);
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
    console.log('📦 Creating product...');
    console.log('📋 Request body:', req.body);
    console.log('🖼️ Files:', req.files ? req.files.length : 'No files');
    
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
    
    // Validation de base
    if (!name || !description || !price || !category || stock === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: name, description, price, category, stock'
      });
    }
    
    // Handle images - version simplifiée sans Cloudinary
    const images = [];
    
    // Si on a des fichiers uploadés
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} images...`);
      
      // Pour le moment, stocker juste les données de base
      // En production, vous utiliserez Cloudinary
      req.files.forEach((file, index) => {
        images.push({
          url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          alt: name || `Product image ${index + 1}`,
          isBase64: true
        });
      });
    } else {
      // Images par défaut selon la catégorie
      const defaultImages = {
        robes: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        pantalons: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        jupes: 'https://images.unsplash.com/photo-1585487000160-6eb9ce6b5a53?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        chaussures: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        bijoux: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      };
      
      images.push({
        url: defaultImages[category] || defaultImages.robes,
        alt: name,
        isDefault: true
      });
    }
    
    // Parse specifications si c'est une string
    let parsedSpecifications = {};
    if (specifications) {
      try {
        parsedSpecifications = typeof specifications === 'string' 
          ? JSON.parse(specifications) 
          : specifications;
      } catch (e) {
        console.warn('⚠️ Could not parse specifications:', e.message);
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
      featured: featured === 'true' || featured === true,
      discount: Number(discount) || 0,
      specifications: parsedSpecifications,
      images
    });
    
    console.log('✅ Product created:', product._id);
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating product',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    console.log('🔄 Updating product:', product._id);
    console.log('📋 Update data:', req.body);
    
    // Update basic fields
    const updatableFields = [
      'name', 'description', 'price', 'category', 
      'stock', 'status', 'featured', 'discount', 'specifications'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'specifications' && typeof req.body[field] === 'string') {
          try {
            product[field] = JSON.parse(req.body[field]);
          } catch (e) {
            console.warn('⚠️ Could not parse specifications:', e.message);
          }
        } else if (field === 'featured') {
          product[field] = req.body[field] === 'true' || req.body[field] === true;
        } else if (field === 'price' || field === 'stock' || field === 'discount') {
          product[field] = Number(req.body[field]);
        } else {
          product[field] = req.body[field];
        }
      }
    });
    
    // Handle images si fournies
    if (req.files && req.files.length > 0) {
      console.log(`📸 Updating ${req.files.length} images...`);
      
      const newImages = [];
      req.files.forEach((file, index) => {
        newImages.push({
          url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          alt: req.body.name || product.name || `Product image ${index + 1}`,
          isBase64: true
        });
      });
      
      product.images = newImages;
    }
    
    await product.save();
    
    console.log('✅ Product updated:', product._id);
    
    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating product',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    await product.deleteOne();
    
    console.log('🗑️ Product deleted:', req.params.id);
    
    res.json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete product error:', error);
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
    const lowStockProducts = await Product.countDocuments({ 
      stock: { $lt: 5, $gt: 0 } 
    });
    
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
    console.error('❌ Get stats error:', error);
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
    console.error('❌ Get featured products error:', error);
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
    console.error('❌ Get products by category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching products by category',
      error: error.message
    });
  }
};
