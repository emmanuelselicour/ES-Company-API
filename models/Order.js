const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    total: Number
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    country: String,
    postalCode: String,
    phone: String
  },
  billingAddress: {
    name: String,
    street: String,
    city: String,
    country: String,
    postalCode: String,
    phone: String
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'mobile_money'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
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

// Middleware pour générer le numéro de commande
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Trouver la dernière commande du jour
    const lastOrder = await this.constructor.findOne({
      orderNumber: new RegExp(`^ORD-${year}${month}${day}`)
    }).sort({ orderNumber: -1 });
    
    let sequence = '001';
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.substr(-3));
      sequence = (lastSeq + 1).toString().padStart(3, '0');
    }
    
    this.orderNumber = `ORD-${year}${month}${day}${sequence}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
