const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Veuillez fournir un email et un mot de passe' 
      });
    }
    
    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Identifiants invalides' 
      });
    }
    
    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Identifiants invalides' 
      });
    }
    
    // Créer le token JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET || 'es-company-secret-key-2024',
      { expiresIn: '24h' }
    );
    
    // Réponse
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
    
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// Vérifier le token
router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Token manquant' 
      });
    }
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'es-company-secret-key-2024'
    );
    
    // Vérifier que l'utilisateur existe toujours
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: 'Token invalide' 
    });
  }
});

// Créer un compte client
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Veuillez remplir tous les champs obligatoires' 
      });
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Cet email est déjà utilisé' 
      });
    }
    
    // Créer l'utilisateur
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: 'customer'
    });
    
    await user.save();
    
    // Créer le token JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET || 'es-company-secret-key-2024',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
    
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

module.exports = router;
