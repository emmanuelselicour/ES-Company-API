const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware basique
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Données en mémoire pour le développement
let products = [
  {
    id: 1,
    name: "Robe d'été fleurie",
    description: "Robe légère et confortable pour l'été",
    price: 2500,
    category: "robes",
    stock: 15,
    status: "active",
    images: [{
      url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      alt: "Robe d'été fleurie"
    }]
  },
  {
    id: 2,
    name: "Pantalon slim noir",
    description: "Pantalon élégant en tissu stretch",
    price: 1800,
    category: "pantalons",
    stock: 25,
    status: "active",
    images: [{
      url: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      alt: "Pantalon slim noir"
    }]
  }
];

let users = [
  {
    id: 1,
    name: "Admin E-S COMPANY",
    email: "admin@escompany.com",
    password: "admin123",
    role: "admin"
  }
];

let carts = [];

// ==================== ROUTES PRODUITS ====================
// GET tous les produits
app.get('/api/products', (req, res) => {
  const { category, search, page = 1, limit = 12 } = req.query;
  
  let filteredProducts = [...products];
  
  // Filtrage par catégorie
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
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
});

// GET produit par ID
app.get('/api/products/:id', (req, res) => {
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
});

// POST créer un produit
app.post('/api/products', (req, res) => {
  const { name, description, price, category, stock } = req.body;
  
  if (!name || !description || !price || !category || !stock) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide all required fields'
    });
  }
  
  const newProduct = {
    id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
    name,
    description,
    price: parseFloat(price),
    category,
    stock: parseInt(stock),
    status: 'active',
    images: req.body.images || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  products.push(newProduct);
  
  res.status(201).json({
    status: 'success',
    message: 'Product created successfully',
    data: { product: newProduct }
  });
});

// PUT mettre à jour un produit
app.put('/api/products/:id', (req, res) => {
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
  
  products[productIndex] = updatedProduct;
  
  res.json({
    status: 'success',
    message: 'Product updated successfully',
    data: { product: updatedProduct }
  });
});

// DELETE supprimer un produit
app.delete('/api/products/:id', (req, res) => {
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
});

// GET produits par catégorie
app.get('/api/products/category/:category', (req, res) => {
  const { category } = req.params;
  const categoryProducts = products.filter(p => 
    p.category === category && p.status === 'active'
  );
  
  res.json({
    status: 'success',
    data: { products: categoryProducts }
  });
});

// GET produits en vedette
app.get('/api/products/featured', (req, res) => {
  const featuredProducts = products
    .filter(p => p.status === 'active')
    .slice(0, 8);
  
  res.json({
    status: 'success',
    data: { products: featuredProducts }
  });
});

// ==================== ROUTES AUTHENTIFICATION ====================
// POST inscription
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
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
      message: 'User already exists'
    });
  }
  
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name,
    email,
    password, // En production, il faut hasher le mot de passe!
    role: 'user',
    createdAt: new Date()
  };
  
  users.push(newUser);
  
  // Créer un panier vide pour l'utilisateur
  carts.push({
    id: carts.length + 1,
    userId: newUser.id,
    items: [],
    totalItems: 0,
    totalPrice: 0
  });
  
  // Générer un token simple (en production, utiliser JWT)
  const token = `simple-token-${newUser.id}-${Date.now()}`;
  
  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      token
    }
  });
});

// POST connexion
app.post('/api/auth/login', (req, res) => {
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
  
  // Générer un token simple
  const token = `simple-token-${user.id}-${Date.now()}`;
  
  res.json({
    status: 'success',
    message: 'Login successful',
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
});

// POST admin login
app.post('/api/auth/admin/login', (req, res) => {
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
});

// GET profil utilisateur
app.get('/api/auth/me', (req, res) => {
  // Vérifier le token dans les headers
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'No token provided'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Extraire l'ID utilisateur du token (très simplifié)
  const match = token.match(/token-(\d+)-/);
  if (!match) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  const userId = parseInt(match[1]);
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
        role: user.role
      }
    }
  });
});

// ==================== ROUTES PANIER ====================
// GET panier utilisateur
app.get('/api/cart', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const match = token.match(/token-(\d+)-/);
  
  if (!match) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  const userId = parseInt(match[1]);
  let cart = carts.find(c => c.userId === userId);
  
  if (!cart) {
    // Créer un panier vide
    cart = {
      id: carts.length + 1,
      userId,
      items: [],
      totalItems: 0,
      totalPrice: 0,
      createdAt: new Date()
    };
    carts.push(cart);
  }
  
  res.json({
    status: 'success',
    data: { cart }
  });
});

// POST ajouter au panier
app.post('/api/cart/items', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const match = token.match(/token-(\d+)-/);
  
  if (!match) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  const userId = parseInt(match[1]);
  const { productId, quantity = 1 } = req.body;
  
  // Trouver le produit
  const product = products.find(p => p.id === parseInt(productId));
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  // Trouver ou créer le panier
  let cart = carts.find(c => c.userId === userId);
  if (!cart) {
    cart = {
      id: carts.length + 1,
      userId,
      items: [],
      totalItems: 0,
      totalPrice: 0,
      createdAt: new Date()
    };
    carts.push(cart);
  }
  
  // Vérifier si le produit est déjà dans le panier
  const existingItemIndex = cart.items.findIndex(item => item.productId === parseInt(productId));
  
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
      image: product.images && product.images[0] ? product.images[0].url : ''
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
});

// PUT mettre à jour la quantité
app.put('/api/cart/items/:productId', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const match = token.match(/token-(\d+)-/);
  
  if (!match) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  const userId = parseInt(match[1]);
  const productId = parseInt(req.params.productId);
  const { quantity } = req.body;
  
  const cart = carts.find(c => c.userId === userId);
  if (!cart) {
    return res.status(404).json({
      status: 'error',
      message: 'Cart not found'
    });
  }
  
  const itemIndex = cart.items.findIndex(item => item.productId === productId);
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
});

// DELETE retirer du panier
app.delete('/api/cart/items/:productId', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const match = token.match(/token-(\d+)-/);
  
  if (!match) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  const userId = parseInt(match[1]);
  const productId = parseInt(req.params.productId);
  
  const cart = carts.find(c => c.userId === userId);
  if (!cart) {
    return res.status(404).json({
      status: 'error',
      message: 'Cart not found'
    });
  }
  
  const itemIndex = cart.items.findIndex(item => item.productId === productId);
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
});

// GET résumé du panier
app.get('/api/cart/summary', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const match = token.match(/token-(\d+)-/);
  
  if (!match) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  const userId = parseInt(match[1]);
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
});

// ==================== ROUTES UTILES ====================
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API E-S COMPANY is running in simple mode',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    stats: {
      products: products.length,
      users: users.length,
      carts: carts.length
    }
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API test route works',
    env: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT
    }
  });
});

// Welcome route
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'Bienvenue sur l\'API E-S COMPANY (Mode Simple)',
    endpoints: {
      products: 'GET /api/products',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      cart: 'GET /api/cart',
      health: 'GET /api/health'
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
  console.error('❌ Error:', err.message);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 E-S COMPANY API (Simple Mode) running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Products loaded: ${products.length}`);
  console.log(`👤 Admin user: admin@escompany.com / admin123`);
});
