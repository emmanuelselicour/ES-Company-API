const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Vérifier les variables d'environnement requises
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Variables d'environnement manquantes: ${missingEnvVars.join(', ')}`);
  console.error('⚠️  Veuillez configurer ces variables sur le dashboard Render');
  
  // Pour le développement, utiliser des valeurs par défaut
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Mode développement: utilisation des valeurs par défaut');
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/escompany';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_please_change_in_production';
  } else {
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS Configuration
const corsOptions = {
  origin: [
    'https://es-company-ht.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Augmenté pour le développement
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const uploadRoutes = require('./routes/upload.routes');
const orderRoutes = require('./routes/order.routes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API E-S COMPANY is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Test route (sans base de données)
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API test route works',
    env: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      has_mongodb_uri: !!process.env.MONGODB_URI,
      has_jwt_secret: !!process.env.JWT_SECRET,
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

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'File too large. Maximum size is 10MB.'
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      status: 'error',
      message: 'Too many files. Maximum is 5 files.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      message: 'Unexpected file field'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }
  
  // MongoDB validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: messages
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      status: 'error',
      message: `Duplicate ${field} value`
    });
  }
  
  // Default error
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🏠 Host: ${conn.connection.host}`);
    
    // Créer l'utilisateur admin par défaut si nécessaire
    await createDefaultAdmin();
    
    // Créer des données de test en développement
    if (process.env.NODE_ENV === 'development') {
      await createTestData();
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Starting server without database connection...');
    
    // En production, on peut choisir de ne pas démarrer sans DB
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Mode production: arrêt du serveur sans base de données');
      process.exit(1);
    }
  }
};

// Fonction pour créer l'admin par défaut
const createDefaultAdmin = async () => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@escompany.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });
    
    if (!existingAdmin) {
      // Hasher le mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      // Créer l'admin
      await User.create({
        name: 'Administrateur E-S COMPANY',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });
      
      console.log('👑 Admin utilisateur créé avec succès');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔐 Mot de passe: ${adminPassword}`);
    } else {
      console.log('👑 Admin utilisateur existe déjà');
    }
  } catch (error) {
    console.error('❌ Erreur création admin:', error.message);
  }
};

// Fonction pour créer des données de test en développement
const createTestData = async () => {
  try {
    const Product = require('./models/Product');
    
    // Vérifier s'il y a déjà des produits
    const productCount = await Product.countDocuments();
    
    if (productCount === 0) {
      console.log('📦 Création de données de test...');
      
      const testProducts = [
        {
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
            size: ["S", "M", "L", "XL"],
            weight: 0.3
          }
        },
        {
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
            size: ["S", "M", "L"],
            weight: 0.4
          }
        },
        {
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
            size: ["S", "M", "L"],
            weight: 0.2
          }
        },
        {
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
            size: ["36", "37", "38", "39"],
            weight: 0.5
          }
        },
        {
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
          }
        }
      ];
      
      await Product.insertMany(testProducts);
      console.log(`✅ ${testProducts.length} produits de test créés`);
    }
  } catch (error) {
    console.error('❌ Erreur création données test:', error.message);
  }
};

// Connexion à la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Connexion à MongoDB
    await connectDB();
    
    // Démarrer le serveur
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔒 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
      console.log(`🗄️  MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
    });
    
    // Gestion propre de l'arrêt
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('💤 HTTP server closed');
        mongoose.connection.close(false, () => {
          console.log('💤 MongoDB connection closed');
          process.exit(0);
        });
      });
    });
    
    process.on('SIGINT', () => {
      console.log('👋 SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('💤 HTTP server closed');
        mongoose.connection.close(false, () => {
          console.log('💤 MongoDB connection closed');
          process.exit(0);
        });
      });
    });
    
    // Gestion des erreurs non catchées
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      server.close(() => {
        process.exit(1);
      });
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      server.close(() => {
        process.exit(1);
      });
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
startServer();

module.exports = app; // Pour les tests
