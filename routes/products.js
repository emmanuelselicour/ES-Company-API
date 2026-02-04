const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const Product = require('../models/Product');
const Category = require('../models/Category');

// GET tous les produits (public)
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      status = 'active',
      featured,
      limit = 50,
      page = 1 
    } = req.query;
    
    // Filtres
    const filter = { status };
    
    if (category) {
      filter.category = category;
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Recherche texte
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find(filter)
      .populate('category', 'name name_en name_es slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Product.countDocuments(filter);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Erreur get products:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// GET produit par ID (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name name_en name_es slug');
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Produit non trouvé' 
      });
    }
    
    res.json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Erreur get product:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// POST créer un produit (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name,
      name_en,
      name_es,
      description,
      description_en,
      description_es,
      category,
      price,
      comparePrice,
      cost,
      sku,
      barcode,
      trackQuantity,
      quantity,
      images,
      status,
      isFeatured,
      tags
    } = req.body;
    
    // Validation
    if (!name || !category || !price) {
      return res.status(400).json({ 
        success: false,
        error: 'Nom, catégorie et prix sont obligatoires' 
      });
    }
    
    // Vérifier que la catégorie existe
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ 
        success: false,
        error: 'Catégorie invalide' 
      });
    }
    
    // Créer le produit
    const product = new Product({
      name,
      name_en: name_en || name,
      name_es: name_es || name,
      description,
      description_en: description_en || description,
      description_es: description_es || description,
      category,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
      sku: sku || undefined,
      barcode: barcode || undefined,
      trackQuantity: trackQuantity || false,
      quantity: quantity || 0,
      images: images || [],
      status: status || 'active',
      isFeatured: isFeatured || false,
      tags: tags || []
    });
    
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name name_en name_es slug');
    
    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: populatedProduct
    });
    
  } catch (error) {
    console.error('Erreur create product:', error);
    
    // Gestion des erreurs de duplication SKU
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        error: 'Ce SKU est déjà utilisé'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// PUT mettre à jour un produit (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Produit non trouvé' 
      });
    }
    
    // Vérifier le SKU unique si modifié
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku: req.body.sku });
      if (existingProduct) {
        return res.status(400).json({ 
          success: false,
          error: 'SKU déjà utilisé' 
        });
      }
    }
    
    // Vérifier la catégorie si modifiée
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({ 
          success: false,
          error: 'Catégorie invalide' 
        });
      }
    }
    
    // Mise à jour
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'createdAt') {
        product[key] = req.body[key];
      }
    });
    
    product.updatedAt = Date.now();
    
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name name_en name_es slug');
    
    res.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: populatedProduct
    });
    
  } catch (error) {
    console.error('Erreur update product:', error);
    
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        error: 'Ce SKU est déjà utilisé'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// DELETE supprimer un produit (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Produit non trouvé' 
      });
    }
    
    await product.deleteOne();
    
    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur delete product:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// GET produits aléatoires
router.get('/random/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    // Récupérer tous les IDs des produits actifs
    const activeProducts = await Product.find({ status: 'active' }).select('_id');
    const productIds = activeProducts.map(p => p._id);
    
    // Mélanger les IDs
    const shuffledIds = [...productIds].sort(() => 0.5 - Math.random());
    
    // Prendre les premiers 'limit' IDs
    const selectedIds = shuffledIds.slice(0, limit);
    
    // Récupérer les produits complets
    const products = await Product.find({ _id: { $in: selectedIds } })
      .populate('category', 'name name_en name_es slug');
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    console.error('Erreur random products:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

module.exports = router;
