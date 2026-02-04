const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
    type: String,
    required: true
  },
  description_en: {
    type: String,
    required: true
  },
  description_es: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0
  },
  cost: {
    type: Number,
    min: 0
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  barcode: {
    type: String
  },
  trackQuantity: {
    type: Boolean,
    default: false
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [{
    url: String,
    publicId: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'out_of_stock'],
    default: 'active'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour les recherches
productSchema.index({ name: 'text', description: 'text', sku: 'text' });

// Middleware pour mettre à jour la date de modification
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Générer SKU automatique si non fourni
  if (!this.sku) {
    const prefix = 'ES';
    const random = Math.floor(1000 + Math.random() * 9000);
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    this.sku = `${prefix}${year}${month}${random}`;
  }
  
  next();
});

module.exports = mongoose.model('Product', productSchema);
