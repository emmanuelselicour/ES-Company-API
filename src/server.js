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
  // Ne pas arrêter pour permettre le déploiement, mais afficher un avertissement
}

// Configuration CORS détaillée
const corsOptions = {
  origin: function (origin, callback) {
    // Liste des origines autorisées
    const allowedOrigins = [
      'https://es-company-ht.netlify.app',
      'https://es-company-ht.netlify.app/admin',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'https://es-company-api.onrender.com' // L'API elle-même
    ];
    
    // Autoriser les requêtes sans origine (comme Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // En développement, autoriser toutes les origines
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌍 Développement: Autorisation CORS pour: ${origin}`);
      return callback(null, true);
    }
    
    // Vérifier si l'origine est dans la liste autorisée
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS autorisé pour: ${origin}`);
      return callback(null, true);
    } else {
      console.log(`❌ CORS bloqué pour: ${origin}`);
      console.log(`📋 Origines autorisées: ${allowedOrigins.join(', ')}`);
      return callback(new Error(`Origine ${origin} non autorisée par CORS`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-Api-Key',
    'x-auth-token'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  maxAge: 86400, // 24 heures en secondes
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Appliquer CORS avec les options
app.use(cors(corsOptions));

// Middleware pour logger les requêtes CORS
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No Origin'}`);
  next();
});

// Middleware pour gérer manuellement les pré-vols OPTIONS
app.options('*', (req, res) => {
  console.log(`🔄 Pré-vol OPTIONS pour: ${req.headers.origin}`);
  
  // Définir les headers CORS manuellement
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://es-company-ht.netlify.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  res.status(204).end();
});

// Middleware standard
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Middleware pour ajouter les headers CORS à toutes les réponses
app.use((req, res, next) => {
  // Déterminer l'origine autorisée
  const allowedOrigin = req.headers.origin || 'https://es-company-ht.netlify.app';
  
  // Vérifier si l'origine est autorisée
  const allowedOrigins = [
    'https://es-company-ht.netlify.app',
    'https://es-company-ht.netlify.app/admin',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  if (allowedOrigins.includes(allowedOrigin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
  } else {
    res.header('Access-Control-Allow-Origin', 'https://es-company-ht.netlify.app');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  
  next();
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const uploadRoutes = require('./routes/upload.routes');

// Routes publiques (sans authentification)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API E-S COMPANY est en ligne',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté',
    cors: 'configuré pour es-company-ht.netlify.app'
  });
});

// Test route pour vérifier CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Test CORS réussi',
    origin: req.headers.origin || 'Non spécifié',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Route simple pour les produits (publique)
app.get('/api/products/public', async (req, res) => {
  try {
    // Simuler des données de produit pour le test
    const mockProducts = [
      {
        _id: '1',
        name: "Robe d'été fleurie",
        description: "Robe légère et confortable pour l'été",
        price: 2500,
        category: "robes",
        stock: 15,
        status: "active",
        images: [{
          url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
          alt: "Robe d'été"
        }]
      },
      {
        _id: '2',
        name: "Pantalon slim noir",
        description: "Pantalon élégant pour le bureau",
        price: 1800,
        category: "pantalons",
        stock: 25,
        status: "active",
        images: [{
          url: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
          alt: "Pantalon slim"
        }]
      }
    ];
    
    res.json({
      status: 'success',
      message: 'Produits publics (test CORS)',
      data: {
        products: mockProducts,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} non trouvée`,
    availableRoutes: [
      'GET /api/health',
      'GET /api/cors-test',
      'GET /api/products/public',
      'GET /api/products',
      'POST /api/auth/login',
      'POST /api/auth/admin/login'
    ]
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });
  
  // Gestion spécifique des erreurs CORS
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      status: 'error',
      message: `Erreur CORS: ${err.message}`,
      tip: 'Vérifiez que votre domaine est autorisé dans la configuration CORS',
      allowedOrigins: [
        'https://es-company-ht.netlify.app',
        'https://es-company-ht.netlify.app/admin',
        'http://localhost:3000'
      ]
    });
  }
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
});

// Database connection avec reconnect
const connectWithRetry = () => {
  console.log('🔄 Tentative de connexion à MongoDB...');
  
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB connecté avec succès');
    console.log(`📊 Base de données: ${mongoose.connection.name}`);
    console.log(`🏠 Hôte: ${mongoose.connection.host}`);
    
    // Créer les indexes
    mongoose.connection.once('open', async () => {
      try {
        await mongoose.connection.db.collection('products').createIndex({ name: 'text', description: 'text' });
        await mongoose.connection.db.collection('products').createIndex({ category: 1 });
        await mongoose.connection.db.collection('products').createIndex({ status: 1 });
        console.log('📈 Indexes MongoDB créés');
      } catch (indexError) {
        console.warn('⚠️ Erreur lors de la création des indexes:', indexError.message);
      }
    });
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MongoDB:', err.message);
    console.log('🔄 Nouvelle tentative dans 5 secondes...');
    setTimeout(connectWithRetry, 5000);
  });
};

// Événements MongoDB
mongoose.connection.on('error', err => {
  console.error('❌ Erreur MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB déconnecté');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔗 MongoDB reconnecté');
});

// Start server avec ou sans MongoDB
const startServer = () => {
  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    console.log(`
    🚀 Serveur démarré sur le port ${PORT}
    🌍 Environnement: ${process.env.NODE_ENV || 'development'}
    🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Non configuré'}
    🔒 JWT Secret: ${process.env.JWT_SECRET ? 'Configuré' : 'Non configuré'}
    🗄️  MongoDB URI: ${process.env.MONGODB_URI ? 'Configuré' : 'Non configuré'}
    🌐 CORS configuré pour:
       - https://es-company-ht.netlify.app
       - https://es-company-ht.netlify.app/admin
       - localhost:3000
       - localhost:5173
    📋 Routes disponibles:
       - GET  /api/health          → Vérifier l'état de l'API
       - GET  /api/cors-test       → Tester CORS
       - GET  /api/products/public → Produits publics (test)
       - GET  /api/products        → Tous les produits
       - POST /api/auth/login      → Connexion utilisateur
       - POST /api/auth/admin/login → Connexion admin
    `);
  });
};

// Connexion initiale
if (process.env.MONGODB_URI) {
  connectWithRetry();
} else {
  console.warn('⚠️ Aucun MONGODB_URI configuré. Mode sans base de données activé.');
  console.warn('💡 Pour utiliser MongoDB, ajoutez MONGODB_URI dans les variables d\'environnement');
}

// Démarrer le serveur (avec ou sans base de données)
startServer();

// Gestion des signaux d'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt du serveur...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Signal SIGINT reçu, arrêt du serveur...');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
