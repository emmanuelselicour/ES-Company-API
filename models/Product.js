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
  options: [{
    name: String,
    values: [String]
  }],
  variants: [{
    sku: String,
    price: Number,
    comparePrice: Number,
    quantity: Number,
    options: [{
      name: String,
      value: String
    }]
  }],
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
  next();
});

module.exports = mongoose.model('Product', productSchema);
