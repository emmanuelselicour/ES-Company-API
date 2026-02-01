const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Vérifier les variables d'environnement
console.log('🔧 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Configured' : 'Not configured');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Configured' : 'Not configured');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'Not configured');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS Configuration
const corsOptions = {
  origin: [
    'https://es-company-ht.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Gérer les pré-vols OPTIONS
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const uploadRoutes = require('./routes/upload.routes');

// Log middleware pour déboguer
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API E-S COMPANY is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      products: '/api/products',
      auth: '/api/auth',
      upload: '/api/upload'
    }
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
    cors: {
      allowed_origins: corsOptions.origin
    }
  });
});

// Demo products endpoint (pour le développement)
app.get('/api/demo/products', (req, res) => {
  const demoProducts = [
    {
      _id: '1',
      name: "Robe d'été fleurie",
      description: "Robe légère et confortable pour l'été, avec motif floral élégant.",
      price: 2500,
      category: "robes",
      stock: 15,
      status: "active",
      featured: true,
      discount: 10,
      images: [
        {
          url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
          alt: "Robe d'été fleurie"
        }
      ],
      specifications: {
        material: "Coton",
        color: "Multicolore",
        size: ["S", "M", "L", "XL"]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: '2',
      name: "Pantalon slim noir",
      description: "Pantalon slim élégant en tissu stretch confortable.",
      price: 1800,
      category: "pantalons",
      stock: 25,
      status: "active",
      featured: false,
      discount: 0,
      images: [
        {
          url: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
          alt: "Pantalon slim noir"
        }
      ],
      specifications: {
        material: "Polyester",
        color: "Noir",
        size: ["S", "M", "L"]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  res.json({
    status: 'success',
    data: {
      products: demoProducts,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    available_routes: {
      products: '/api/products',
      health: '/api/health',
      test: '/api/test',
      demo_products: '/api/demo/products'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // Erreurs Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors
    });
  }
  
  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  // Erreurs générales
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection avec gestion d'erreur améliorée
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI not configured, using demo mode');
      console.log('📝 You can still use the API with demo data');
      console.log('📝 To use real database, set MONGODB_URI in environment variables');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Créer des indexes pour la performance
    try {
      await mongoose.connection.db.collection('products').createIndex({ name: 'text', description: 'text' });
      await mongoose.connection.db.collection('products').createIndex({ category: 1 });
      await mongoose.connection.db.collection('products').createIndex({ status: 1 });
      await mongoose.connection.db.collection('products').createIndex({ featured: 1 });
      console.log('✅ Database indexes created');
    } catch (indexError) {
      console.warn('⚠️ Could not create indexes:', indexError.message);
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Starting server in demo mode (without database)');
    console.log('📝 You can still access demo data at /api/demo/products');
  }
};

// Connecter à la base de données
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
  console.log(`🔒 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log('📋 Available routes:');
  console.log('   GET  /api/health          - Health check');
  console.log('   GET  /api/test           - Test route');
  console.log('   GET  /api/products       - List products');
  console.log('   GET  /api/demo/products  - Demo products (no DB required)');
  console.log('   POST /api/auth/login     - Login');
  console.log('   POST /api/auth/register  - Register');
});
