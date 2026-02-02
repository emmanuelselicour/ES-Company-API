const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuration CORS pour accepter votre domaine Netlify
const corsOptions = {
  origin: [
    'https://es-company-ht.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Middleware basique
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Gérer les pré-requêtes OPTIONS
app.options('*', cors(corsOptions));

// Données en mémoire pour le développement
let products = [
  {
    id: 1,
    name: "Robe d'été fleurie",
    description: "Robe légère et confortable pour l'été, avec motif floral élégant. Parfaite pour les occasions spéciales ou les sorties quotidiennes.",
    price: 2500,
    category: "robes",
    stock: 15,
    status: "active",
    featured: true,
    discount: 10,
    images: [{
      url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      alt: "Robe d'été fleurie"
    }],
    specifications: {
      material: "Coton",
      color: "Multicolore",
      size: ["S", "M", "L", "XL"]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: "Pantalon slim noir",
    description: "Pantalon slim élégant en tissu stretch confortable. Idéal pour le bureau ou les sorties.",
    price: 1800,
    category: "pantalons",
    stock: 25,
    status: "active",
    featured: false,
    discount: 0,
    images: [{
      url: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      alt: "Pantalon slim noir"
    }],
    specifications: {
      material: "Polyester",
      color: "Noir",
      size: ["S", "M", "L"]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    name: "Jupe plissée bleue",
    description: "Jupe plissée midi dans un bleu pastel tendance. Élégante et confortable.",
    price: 1200,
    category: "jupes",
    stock: 10,
    status: "active",
    featured: true,
    discount: 5,
    images: [{
      url: "https://images.unsplash.com/photo-1585487000160-6eb9ce6b5a53?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      alt: "Jupe plissée bleue"
    }],
    specifications: {
      material: "Polyester",
      color: "Bleu pastel",
      size: ["S", "M", "L"]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 4,
    name: "Chaussures à talons rouges",
    description: "Chaussures élégantes à talons pour occasions spéciales. Confortables et stylées.",
    price: 3500,
    category: "chaussures",
    stock: 8,
    status: "active",
    featured: true,
    discount: 15,
    images: [{
      url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      alt: "Chaussures à talons rouges"
    }],
    specifications: {
      material: "Cuir",
      color: "Rouge",
      size: ["36", "37", "38", "39"]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 5,
    name: "Collier en argent",
    description: "Collier élégant en argent avec pendentif. Bijou raffiné pour toutes occasions.",
    price: 800,
    category: "bijoux",
    stock: 30,
    status: "active",
    featured: false,
    discount: 0,
    images: [{
      url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      alt: "Collier en argent"
    }],
    specifications: {
      material: "Argent 925",
      color: "Argent",
      length: "45 cm"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let users = [
  {
    id: 1,
    name: "Administrateur E-S COMPANY",
    email: "admin@escompany.com",
    password: "admin123",
    role: "admin",
    isActive: true,
    createdAt: new Date()
  }
];

let carts = [];
let orders = [];

// Fonction utilitaire pour générer des IDs
function generateId(items) {
  return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
}

// ==================== ROUTES PRODUITS ====================
// GET tous les produits
app.get('/api/products', (req, res) => {
  try {
    const { category, status = 'active', page = 1, limit = 12, search } = req.query;
    
    let filteredProducts = [...products];
    
    // Filtrage par catégorie
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    // Filtrage par statut
    if (status) {
      filteredProducts = filteredProducts.filter(p => p.status === status);
    }
    
    // Recherche
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    res.json({
      status: 'success',
      data: {
        products: paginatedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredProducts.length,
          pages: Math.ceil(filteredProducts.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching products'
    });
  }
});

// GET produit par ID
app.get('/api/products/:id', (req, res) => {
  try {
    const product = products.find(p => p.id === parseInt(req.params.id));
    
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
      message: 'Error fetching product'
    });
  }
});

// POST créer un produit
app.post('/api/products', (req, res) => {
  try {
    console.log('📦 Creating product...', req.body);
    
    const { name, description, price, category, stock, featured, discount, specifications } = req.body;
    
    // Validation
    if (!name || !description || !price || !category || stock === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }
    
    const newProduct = {
      id: generateId(products),
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      status: 'active',
      featured: featured === true || featured === 'true',
      discount: parseFloat(discount) || 0,
      images: req.body.images || [],
      specifications: specifications || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    products.push(newProduct);
    
    console.log('✅ Product created:', newProduct.id);
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product: newProduct }
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating product',
      error: error.message
    });
  }
});

// PUT mettre à jour un produit
app.put('/api/products/:id', (req, res) => {
  try {
    const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
    
    if (productIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    const updatedProduct = {
      ...products[productIndex],
      ...req.body,
      updatedAt: new Date()
    };
    
    // Convertir les types si nécessaire
    if (req.body.price) updatedProduct.price = parseFloat(req.body.price);
    if (req.body.stock) updatedProduct.stock = parseInt(req.body.stock);
    if (req.body.discount) updatedProduct.discount = parseFloat(req.body.discount);
    if (req.body.featured !== undefined) {
      updatedProduct.featured = req.body.featured === true || req.body.featured === 'true';
    }
    
    products[productIndex] = updatedProduct;
    
    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });
  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating product'
    });
  }
});

// DELETE supprimer un produit
app.delete('/api/products/:id', (req, res) => {
  try {
    const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
    
    if (productIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    const deletedProduct = products.splice(productIndex, 1)[0];
    
    res.json({
      status: 'success',
      message: 'Product deleted successfully',
      data: { product: deletedProduct }
    });
  } catch (error) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting product'
    });
  }
});

// GET produits par catégorie
app.get('/api/products/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 12 } = req.query;
    
    const categoryProducts = products
      .filter(p => p.category === category && p.status === 'active')
      .slice(0, parseInt(limit));
    
    res.json({
      status: 'success',
      data: { products: categoryProducts }
    });
  } catch (error) {
    console.error('❌ Get products by category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching products by category'
    });
  }
});

// GET produits en vedette
app.get('/api/products/featured', (req, res) => {
  try {
    const featuredProducts = products
      .filter(p => p.featured && p.status === 'active')
      .slice(0, 8);
    
    res.json({
      status: 'success',
      data: { products: featuredProducts }
    });
  } catch (error) {
    console.error('❌ Get featured products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching featured products'
    });
  }
});

// GET statistiques des produits
app.get('/api/products/stats', (req, res) => {
  try {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const outOfStockProducts = products.filter(p => p.status === 'out_of_stock').length;
    const lowStockProducts = products.filter(p => p.stock < 5 && p.stock > 0).length;
    
    const totalValue = products.reduce((sum, product) => {
      return sum + (product.price * product.stock);
    }, 0);
    
    const categoryStats = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = { count: 0, totalStock: 0 };
      }
      acc[product.category].count++;
      acc[product.category].totalStock += product.stock;
      return acc;
    }, {});
    
    res.json({
      status: 'success',
      data: {
        totalProducts,
        activeProducts,
        outOfStockProducts,
        lowStockProducts,
        inventoryValue: totalValue,
        categoryStats: Object.entries(categoryStats).map(([category, stats]) => ({
          category,
          ...stats
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get product stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching product statistics'
    });
  }
});

// ==================== ROUTES AUTHENTIFICATION ====================
// POST inscription
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email and password'
      });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }
    
    const newUser = {
      id: generateId(users),
      name,
      email,
      password, // ⚠️ En production, il faut hasher le mot de passe!
      phone: phone || '',
      role: 'user',
      isActive: true,
      preferences: {
        newsletter: true,
        notifications: true
      },
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    users.push(newUser);
    
    // Créer un panier vide pour l'utilisateur
    carts.push({
      id: generateId(carts),
      userId: newUser.id,
      items: [],
      totalItems: 0,
      totalPrice: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Générer un token simple (en production, utiliser JWT)
    const token = `user-token-${newUser.id}-${Date.now()}`;
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          preferences: newUser.preferences
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error registering user',
      error: error.message
    });
  }
});

// POST connexion
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }
    
    // Mettre à jour l'activité
    user.lastActivity = new Date();
    
    // Générer un token
    const token = `user-token-${user.id}-${Date.now()}`;
    
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          preferences: user.preferences
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging in'
    });
  }
});

// POST admin login
app.post('/api/auth/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => 
      u.email === email && 
      u.password === password && 
      u.role === 'admin'
    );
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials or not authorized'
      });
    }
    
    // Mettre à jour l'activité
    user.lastActivity = new Date();
    
    const token = `admin-token-${user.id}-${Date.now()}`;
    
    res.json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging in as admin'
    });
  }
});

// GET profil utilisateur
app.get('/api/auth/me', (req, res) => {
  try {
    // Vérifier le token dans les headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Extraire l'ID utilisateur du token
    const match = token.match(/(user|admin)-token-(\d+)-/);
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.json({
      status: 'success',
      data: { 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          preferences: user.preferences
        }
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting user profile'
    });
  }
});

// PUT mettre à jour le profil
app.put('/api/auth/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const { name, phone, preferences } = req.body;
    
    // Mettre à jour les champs
    if (name) users[userIndex].name = name;
    if (phone) users[userIndex].phone = phone;
    if (preferences) {
      users[userIndex].preferences = {
        ...users[userIndex].preferences,
        ...preferences
      };
    }
    
    users[userIndex].lastActivity = new Date();
    
    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { 
        user: {
          id: users[userIndex].id,
          name: users[userIndex].name,
          email: users[userIndex].email,
          role: users[userIndex].role,
          phone: users[userIndex].phone,
          preferences: users[userIndex].preferences
        }
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile'
    });
  }
});

// ==================== ROUTES PANIER ====================
// GET panier utilisateur
app.get('/api/cart', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    let cart = carts.find(c => c.userId === userId);
    
    if (!cart) {
      // Créer un panier vide
      cart = {
        id: generateId(carts),
        userId,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      carts.push(cart);
    }
    
    // Récupérer les informations complètes des produits
    const cartWithProducts = {
      ...cart,
      items: cart.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...item,
          product: product || null
        };
      })
    };
    
    res.json({
      status: 'success',
      data: { cart: cartWithProducts }
    });
  } catch (error) {
    console.error('❌ Get cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching cart'
    });
  }
});

// POST ajouter au panier
app.post('/api/cart/items', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    const { productId, quantity = 1, color, size } = req.body;
    
    // Trouver le produit
    const product = products.find(p => p.id === parseInt(productId));
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    if (product.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Product is not available'
      });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({
        status: 'error',
        message: `Only ${product.stock} items available in stock`
      });
    }
    
    // Trouver ou créer le panier
    let cart = carts.find(c => c.userId === userId);
    if (!cart) {
      cart = {
        id: generateId(carts),
        userId,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      carts.push(cart);
    }
    
    // Vérifier si le produit est déjà dans le panier (avec mêmes options)
    const existingItemIndex = cart.items.findIndex(item => 
      item.productId === parseInt(productId) &&
      item.color === color &&
      item.size === size
    );
    
    if (existingItemIndex > -1) {
      // Mettre à jour la quantité
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Ajouter un nouvel article
      cart.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.images && product.images[0] ? product.images[0].url : '',
        color: color || '',
        size: size || ''
      });
    }
    
    // Recalculer les totaux
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    
    res.json({
      status: 'success',
      message: 'Item added to cart',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error adding item to cart'
    });
  }
});

// PUT mettre à jour la quantité
app.put('/api/cart/items/:productId', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    const productId = parseInt(req.params.productId);
    const { quantity, color, size } = req.body;
    
    if (!quantity || quantity < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid quantity is required'
      });
    }
    
    const cart = carts.find(c => c.userId === userId);
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    const itemIndex = cart.items.findIndex(item => 
      item.productId === productId &&
      item.color === (color || '') &&
      item.size === (size || '')
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found in cart'
      });
    }
    
    if (quantity <= 0) {
      // Supprimer l'article
      cart.items.splice(itemIndex, 1);
    } else {
      // Mettre à jour la quantité
      cart.items[itemIndex].quantity = quantity;
    }
    
    // Recalculer les totaux
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    
    res.json({
      status: 'success',
      message: 'Cart updated',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Update cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating cart'
    });
  }
});

// DELETE retirer du panier
app.delete('/api/cart/items/:productId', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    const productId = parseInt(req.params.productId);
    const { color, size } = req.body;
    
    const cart = carts.find(c => c.userId === userId);
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    const itemIndex = cart.items.findIndex(item => 
      item.productId === productId &&
      item.color === (color || '') &&
      item.size === (size || '')
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found in cart'
      });
    }
    
    cart.items.splice(itemIndex, 1);
    
    // Recalculer les totaux
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    
    res.json({
      status: 'success',
      message: 'Item removed from cart',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error removing item from cart'
    });
  }
});

// GET résumé du panier
app.get('/api/cart/summary', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    const cart = carts.find(c => c.userId === userId);
    
    if (!cart) {
      return res.json({
        status: 'success',
        data: {
          totalItems: 0,
          totalPrice: 0,
          items: []
        }
      });
    }
    
    res.json({
      status: 'success',
      data: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        items: cart.items
      }
    });
  } catch (error) {
    console.error('❌ Get cart summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting cart summary'
    });
  }
});

// POST appliquer un coupon
app.post('/api/cart/coupon', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    const { code, discount = 10, discountType = 'percentage' } = req.body;
    
    const cart = carts.find(c => c.userId === userId);
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    // Appliquer le coupon
    cart.coupon = {
      code,
      discount: parseFloat(discount),
      discountType
    };
    
    cart.updatedAt = new Date();
    
    res.json({
      status: 'success',
      message: 'Coupon applied successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Apply coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error applying coupon'
    });
  }
});

// DELETE supprimer le coupon
app.delete('/api/cart/coupon', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const match = token.match(/(user|admin)-token-(\d+)-/);
    
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    const userId = parseInt(match[2]);
    
    const cart = carts.find(c => c.userId === userId);
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    // Supprimer le coupon
    delete cart.coupon;
    cart.updatedAt = new Date();
    
    res.json({
      status: 'success',
      message: 'Coupon removed successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Remove coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error removing coupon'
    });
  }
});

// ==================== ROUTES UTILES ====================
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API E-S COMPANY is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    stats: {
      products: products.length,
      users: users.length,
      carts: carts.length
    },
    frontend: process.env.FRONTEND_URL
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API test route works',
    env: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      frontend_url: process.env.FRONTEND_URL
    },
    headers: req.headers
  });
});

// Welcome route
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'Bienvenue sur l\'API E-S COMPANY',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me'
      },
      products: {
        list: 'GET /api/products',
        get: 'GET /api/products/:id',
        create: 'POST /api/products',
        update: 'PUT /api/products/:id',
        delete: 'DELETE /api/products/:id'
      },
      cart: {
        get: 'GET /api/cart',
        add: 'POST /api/cart/items',
        update: 'PUT /api/cart/items/:id',
        remove: 'DELETE /api/cart/items/:id'
      }
    },
    version: '1.0.0'
  });
});

// 404 handler pour les routes API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  console.error('❌ Stack:', err.stack);
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 E-S COMPANY API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Products loaded: ${products.length}`);
  console.log(`👤 Admin user: admin@escompany.com / admin123`);
  console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_URL || 'all origins'}`);
});
