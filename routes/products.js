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
      status, 
      featured,
      sort = 'createdAt',
      order = 'desc',
      limit = 50,
      page = 1 
    } = req.query;
    
    // Filtres
    const filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (status) {
      filter.status = status;
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
    
    // Tri
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = {};
    sortObj[sort] = sortOrder;
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find(filter)
      .populate('category', 'name name_en name_es slug')
      .sort(sortObj)
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET produit par ID (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name name_en name_es slug');
    
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    res.json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Erreur get product:', error);
    res.status(500).json({ error: 'Erreur serveur' });
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
      tags,
      options,
      variants
    } = req.body;
    
    // Validation
    if (!name || !category || !price) {
      return res.status(400).json({ 
        error: 'Nom, catégorie et prix sont obligatoires' 
      });
    }
    
    // Vérifier que la catégorie existe
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ error: 'Catégorie invalide' });
    }
    
    // Générer SKU automatique si non fourni
    let productSku = sku;
    if (!productSku) {
      const prefix = 'ES';
      const random = Math.floor(1000 + Math.random() * 9000);
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      productSku = `${prefix}${year}${month}${random}`;
    }
    
    // Vérifier si SKU existe déjà
    if (sku) {
      const existingProduct = await Product.findOne({ sku: productSku });
      if (existingProduct) {
        return res.status(400).json({ error: 'SKU déjà utilisé' });
      }
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
      sku: productSku,
      barcode,
      trackQuantity: trackQuantity || false,
      quantity: quantity || 0,
      images: images || [],
      status: status || 'active',
      isFeatured: isFeatured || false,
      tags: tags || [],
      options: options || [],
      variants: variants || []
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT mettre à jour un produit (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    // Vérifier le SKU unique si modifié
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku: req.body.sku });
      if (existingProduct) {
        return res.status(400).json({ error: 'SKU déjà utilisé' });
      }
    }
    
    // Vérifier la catégorie si modifiée
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({ error: 'Catégorie invalide' });
      }
    }
    
    // Mise à jour
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v') {
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE supprimer un produit (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    // Vérifier s'il y a des commandes pour ce produit
    // (À implémenter si nécessaire)
    
    await product.deleteOne();
    
    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur delete product:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST upload image (admin)
router.post('/:id/images', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    const { images } = req.body;
    
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Images invalides' });
    }
    
    // Ajouter les nouvelles images
    product.images.push(...images);
    
    // Marquer la première image comme principale si aucune image principale
    if (product.images.length > 0 && !product.images.some(img => img.isMain)) {
      product.images[0].isMain = true;
    }
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Images ajoutées avec succès',
      data: product.images
    });
    
  } catch (error) {
    console.error('Erreur upload images:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT définir image principale (admin)
router.put('/:id/images/main', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    const { imageIndex } = req.body;
    
    if (imageIndex === undefined || imageIndex < 0 || imageIndex >= product.images.length) {
      return res.status(400).json({ error: 'Index d\'image invalide' });
    }
    
    // Réinitialiser toutes les images
    product.images.forEach((img, index) => {
      img.isMain = index === imageIndex;
    });
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Image principale définie',
      data: product.images
    });
    
  } catch (error) {
    console.error('Erreur set main image:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE supprimer une image (admin)
router.delete('/:id/images/:imageIndex', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    const imageIndex = parseInt(req.params.imageIndex);
    
    if (imageIndex < 0 || imageIndex >= product.images.length) {
      return res.status(400).json({ error: 'Index d\'image invalide' });
    }
    
    // Supprimer l'image
    product.images.splice(imageIndex, 1);
    
    // Si on a supprimé l'image principale et qu'il reste des images, définir la première comme principale
    if (product.images.length > 0 && !product.images.some(img => img.isMain)) {
      product.images[0].isMain = true;
    }
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Image supprimée',
      data: product.images
    });
    
  } catch (error) {
    console.error('Erreur delete image:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET produits aléatoires
router.get('/random/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const products = await Product.aggregate([
      { $match: { status: 'active' } },
      { $sample: { size: limit } },
      { 
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
    ]);
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    console.error('Erreur random products:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
