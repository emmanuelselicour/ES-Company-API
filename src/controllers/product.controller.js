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
      status,
      sort = '-createdAt',
      search,
      featured
    } = req.query;
    
    // Build filter
    const filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (status) {
      filter.status = status;
    } else {
      // Par défaut, montrer seulement les actifs pour le public
      if (!req.user || req.user.role !== 'admin') {
        filter.status = 'active';
      }
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    if (featured === 'true') {
      filter.featured = true;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    
    // Execute query
    let productsQuery = Product.find(filter)
      .skip(skip)
      .limit(Number(limit));
    
    // Handle sorting
    if (sort) {
      const sortObject = {};
      if (sort.startsWith('-')) {
        sortObject[sort.substring(1)] = -1;
      } else {
        sortObject[sort] = 1;
      }
      productsQuery = productsQuery.sort(sortObject);
    }
    
    const products = await productsQuery;
    
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
    
    // Si l'utilisateur n'est pas admin et le produit est inactif
    if ((!req.user || req.user.role !== 'admin') && product.status !== 'active') {
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
    console.log('🖼️ Files received:', req.files ? req.files.length : 0);
    
    const {
      name,
      description,
      price,
      category,
      stock,
      status = 'active',
      featured = false,
      discount = 0,
      specifications,
      images: imagesJson
    } = req.body;
    
    // Validation de base
    if (!name || !description || !price || !category || stock === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: name, description, price, category, stock'
      });
    }
    
    let images = [];
    
    // Option 1: Images from uploaded files
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} uploaded images...`);
      
      req.files.forEach((file, index) => {
        // Convertir le buffer en base64 pour stockage temporaire
        const base64Image = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64Image}`;
        
        images.push({
          url: dataUrl,
          alt: name || `Product image ${index + 1}`,
          filename: file.originalname,
          isBase64: true
        });
      });
    }
    // Option 2: Images from JSON string in body
    else if (imagesJson) {
      try {
        const parsedImages = typeof imagesJson === 'string' 
          ? JSON.parse(imagesJson) 
          : imagesJson;
        
        if (Array.isArray(parsedImages)) {
          images = parsedImages.map(img => ({
            url: img.url || img,
            alt: img.alt || name,
            isExternal: true
          }));
        }
      } catch (e) {
        console.warn('⚠️ Could not parse images JSON:', e.message);
      }
    }
    // Option 3: Default image based on category
    else {
      const defaultImages = {
        robes: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        pantalons: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        jupes: 'https://images.unsplash.com/photo-1585487000160-6eb9ce6b5a53?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        chaussures: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
        bijoux: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      };
      
      images.push({
        url: defaultImages[category] || defaultImages.robes,
        alt: name || 'Product image',
        isDefault: true
      });
    }
    
    // Parse specifications
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
    const productData = {
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
    };
    
    console.log('📝 Product data to save:', productData);
    
    const product = await Product.create(productData);
    
    console.log('✅ Product created successfully:', product._id);
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    console.error('❌ Error stack:', error.stack);
    
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
    console.log('🖼️ Update files:', req.files ? req.files.length : 0);
    
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
    
    // Handle images if provided
    if (req.files && req.files.length > 0) {
      console.log(`📸 Updating with ${req.files.length} new images...`);
      
      const newImages = [];
      req.files.forEach((file, index) => {
        const base64Image = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64Image}`;
        
        newImages.push({
          url: dataUrl,
          alt: req.body.name || product.name || `Product image ${index + 1}`,
          filename: file.originalname,
          isBase64: true
        });
      });
      
      product.images = newImages;
    }
    // Handle images from JSON if provided
    else if (req.body.images) {
      try {
        const imagesData = typeof req.body.images === 'string' 
          ? JSON.parse(req.body.images) 
          : req.body.images;
        
        if (Array.isArray(imagesData)) {
          product.images = imagesData.map(img => ({
            url: img.url || img,
            alt: img.alt || product.name,
            isExternal: true
          }));
        }
      } catch (e) {
        console.warn('⚠️ Could not parse images for update:', e.message);
      }
    }
    
    await product.save();
    
    console.log('✅ Product updated successfully:', product._id);
    
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
    
    // Instead of deleting, mark as inactive
    product.status = 'inactive';
    await product.save();
    
    console.log('🗑️ Product marked as inactive:', req.params.id);
    
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
    const inactiveProducts = await Product.countDocuments({ status: 'inactive' });
    
    // Get total inventory value
    const inventoryStats = await Product.aggregate([
      {
        $match: { status: 'active' }
      },
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
        $match: { status: 'active' }
      },
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
      stock: { $lt: 5, $gt: 0 },
      status: 'active'
    });
    
    // Get no stock products
    const noStockProducts = await Product.countDocuments({ 
      stock: 0,
      status: 'active'
    });
    
    res.json({
      status: 'success',
      data: {
        totalProducts,
        activeProducts,
        outOfStockProducts,
        inactiveProducts,
        lowStockProducts,
        noStockProducts,
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
    const products = await Product.find({ 
      featured: true, 
      status: 'active',
      stock: { $gt: 0 }
    })
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
      status: 'active',
      stock: { $gt: 0 }
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
