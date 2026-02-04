const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'customer'],
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    country: String,
    postalCode: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Créer l'utilisateur admin par défaut
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const adminExists = await this.findOne({ email: 'es@company.com' });
    
    if (!adminExists) {
      const admin = new this({
        name: 'Administrateur',
        email: 'es@company.com',
        password: '04004749',
        role: 'admin',
        phone: '+509 48 00 0000'
      });
      
      await admin.save();
      console.log('✅ Administrateur par défaut créé');
    }
  } catch (error) {
    console.error('❌ Erreur création admin:', error);
  }
};

module.exports = mongoose.model('User', userSchema);
