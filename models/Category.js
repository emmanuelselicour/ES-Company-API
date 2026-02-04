const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  name_en: {
    type: String,
    required: true,
    trim: true
  },
  name_es: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  description_en: {
    type: String
  },
  description_es: {
    type: String
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    url: String,
    publicId: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
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

// Middleware pour générer le slug avant sauvegarde
categorySchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Category', categorySchema);
