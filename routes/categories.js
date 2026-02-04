const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const Category = require('../models/Category');

// GET toutes les catégories (public)
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    
    const filter = {};
    if (active === 'true') {
      filter.isActive = true;
    }
    
    const categories = await Category.find(filter)
      .sort('order')
      .populate('parent', 'name slug');
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('Erreur get categories:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// GET catégorie par ID (public)
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name slug');
    
    if (!category) {
      return res.status(404).json({ 
        success: false,
        error: 'Catégorie non trouvée' 
      });
    }
    
    res.json({
      success: true,
      data: category
    });
    
  } catch (error) {
    console.error('Erreur get category:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// POST créer une catégorie (admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, name_en, name_es, description, description_en, description_es, parent, image, isActive, order } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false,
        error: 'Nom obligatoire' 
      });
    }
    
    // Générer le slug
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Vérifier si le slug existe déjà
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ 
        success: false,
        error: 'Cette catégorie existe déjà' 
      });
    }
    
    // Vérifier le parent si fourni
    if (parent) {
      const parentExists = await Category.findById(parent);
      if (!parentExists) {
        return res.status(400).json({ 
          success: false,
          error: 'Catégorie parente invalide' 
        });
      }
    }
    
    const category = new Category({
      name,
      name_en: name_en || name,
      name_es: name_es || name,
      description,
      description_en: description_en || description,
      description_es: description_es || description,
      slug,
      parent: parent || null,
      image,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });
    
    await category.save();
    
    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: category
    });
    
  } catch (error) {
    console.error('Erreur create category:', error);
    
    if (error.code === 11000 && error.keyPattern?.slug) {
      return res.status(400).json({
        success: false,
        error: 'Cette catégorie existe déjà'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// PUT mettre à jour une catégorie (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ 
        success: false,
        error: 'Catégorie non trouvée' 
      });
    }
    
    // Si le nom change, régénérer le slug
    if (req.body.name && req.body.name !== category.name) {
      const slug = req.body.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Vérifier si le nouveau slug existe déjà
      const existingCategory = await Category.findOne({ slug, _id: { $ne: category._id } });
      if (existingCategory) {
        return res.status(400).json({ 
          success: false,
          error: 'Ce nom de catégorie est déjà utilisé' 
        });
      }
      
      req.body.slug = slug;
    }
    
    // Vérifier le parent si fourni
    if (req.body.parent && req.body.parent !== category.parent?.toString()) {
      if (req.body.parent === category._id.toString()) {
        return res.status(400).json({ 
          success: false,
          error: 'Une catégorie ne peut pas être son propre parent' 
        });
      }
      
      const parentExists = await Category.findById(req.body.parent);
      if (!parentExists) {
        return res.status(400).json({ 
          success: false,
          error: 'Catégorie parente invalide' 
        });
      }
    }
    
    // Mise à jour
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'createdAt') {
        category[key] = req.body[key];
      }
    });
    
    category.updatedAt = Date.now();
    
    await category.save();
    
    res.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: category
    });
    
  } catch (error) {
    console.error('Erreur update category:', error);
    
    if (error.code === 11000 && error.keyPattern?.slug) {
      return res.status(400).json({
        success: false,
        error: 'Ce nom de catégorie est déjà utilisé'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// DELETE supprimer une catégorie (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ 
        success: false,
        error: 'Catégorie non trouvée' 
      });
    }
    
    // Vérifier s'il y a des produits dans cette catégorie
    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ category: category._id });
    
    if (productCount > 0) {
      return res.status(400).json({ 
        success: false,
        error: `Impossible de supprimer cette catégorie car ${productCount} produit(s) y sont associés` 
      });
    }
    
    // Vérifier s'il y a des sous-catégories
    const subCategoryCount = await Category.countDocuments({ parent: category._id });
    
    if (subCategoryCount > 0) {
      return res.status(400).json({ 
        success: false,
        error: `Impossible de supprimer cette catégorie car elle contient ${subCategoryCount} sous-catégorie(s)` 
      });
    }
    
    await category.deleteOne();
    
    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
    
  } catch (error) {
    console.error('Erreur delete category:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

module.exports = router;
