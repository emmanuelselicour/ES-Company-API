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
  console.log('📝 Variables actuellement définies:');
  console.log('- PORT:', process.env.PORT);
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Défini' : 'Non défini');
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Défini' : 'Non défini');
  process.exit(1);
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
    'http://localhost:5173', // Vite dev server
    process.env.FRONTEND_URL
  ].filter(Boolean), // Filtrer les valeurs null/undefined
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use('/api/', limiter);

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const uploadRoutes = require('./routes/upload.routes');

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
    cors: {
      allowedOrigins: corsOptions.origin
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
      frontend_url: process.env.FRONTEND_URL,
      has_mongodb_uri: !!process.env.MONGODB_URI,
      has_jwt_secret: !!process.env.JWT_SECRET,
      admin_email: process.env.ADMIN_EMAIL,
      admin_password_set: !!process.env.ADMIN_PASSWORD
    },
    system: {
      node_version: process.version,
      platform: process.platform,
      uptime: process.uptime()
    }
  });
});

// Route pour créer un admin rapidement (à supprimer en production)
app.post('/api/init-admin', async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Vérifier si un admin existe déjà
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@escompany.com' });
    
    if (adminExists) {
      return res.json({
        status: 'success',
        message: 'Admin user already exists',
        user: {
          email: adminExists.email,
          role: adminExists.role,
          created: adminExists.createdAt
        }
      });
    }
    
    // Créer l'admin
    const adminUser = new User({
      name: 'Administrateur E-S COMPANY',
      email: process.env.ADMIN_EMAIL || 'admin@escompany.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });
    
    await adminUser.save();
    
    res.json({
      status: 'success',
      message: 'Admin user created successfully',
      user: {
        email: adminUser.email,
        role: adminUser.role,
        created: adminUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating admin user',
      error: error.message
    });
  }
});

// Route pour lister tous les utilisateurs (dev seulement)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/dev/users', async (req, res) => {
    try {
      const User = require('./models/User');
      const users = await User.find({}).select('-password');
      
      res.json({
        status: 'success',
        count: users.length,
        users
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /api/health',
      'GET /api/test',
      'GET /api/products',
      'GET /api/products/:id',
      'POST /api/auth/login',
      'POST /api/auth/admin/login',
      'POST /api/auth/register',
      'POST /api/init-admin (dev only)'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // Erreur Mongoose validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Erreur Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate field value entered'
    });
  }
  
  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  // Erreur JWT expired
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection avec retry
const connectWithRetry = () => {
  console.log('🔗 Connecting to MongoDB...');
  
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📍 Host: ${mongoose.connection.host}`);
    
    // Créer l'utilisateur admin après connexion
    createAdminUser();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

// Fonction pour créer l'utilisateur admin
const createAdminUser = async () => {
  try {
    const User = require('./models/User');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@escompany.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Vérifier si un admin existe déjà
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (adminExists) {
      console.log('✅ Admin user already exists:', adminExists.email);
      return;
    }
    
    // Créer l'admin
    const adminUser = new User({
      name: 'Administrateur E-S COMPANY',
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });
    
    await adminUser.save();
    console.log('✅ Admin user created:', adminUser.email);
    console.log('🔑 Default credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

// Événements de connexion MongoDB
mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

// Gérer la déconnexion proprement
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('👋 MongoDB connection closed through app termination');
  process.exit(0);
});

// Démarrer la connexion MongoDB
connectWithRetry();

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
  console.log(`🔒 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`🗄️  MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  ${server.address().port ? `http://localhost:${PORT}` : ''}/api/health`);
  console.log(`   GET  ${server.address().port ? `http://localhost:${PORT}` : ''}/api/test`);
  console.log(`   GET  ${server.address().port ? `http://localhost:${PORT}` : ''}/api/products`);
  console.log(`   POST ${server.address().port ? `http://localhost:${PORT}` : ''}/api/auth/admin/login`);
  console.log(`   POST ${server.address().port ? `http://localhost:${PORT}` : ''}/api/init-admin`);
  console.log(`\n👤 Admin credentials will be created automatically on first run`);
});

// Gestion des erreurs du serveur
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    throw error;
  }
});

// Exporter l'app pour les tests
module.exports = app;
