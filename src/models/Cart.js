const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  image: {
    type: String,
    required: true
  },
  color: String,
  size: String
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  coupon: {
    code: String,
    discount: Number,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    }
  },
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    phone: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware pour mettre à jour les totaux
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  
  const itemsTotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  
  // Appliquer coupon si existant
  if (this.coupon && this.coupon.code) {
    if (this.coupon.discountType === 'percentage') {
      this.totalPrice = itemsTotal * (1 - this.coupon.discount / 100);
    } else {
      this.totalPrice = Math.max(0, itemsTotal - this.coupon.discount);
    }
  } else {
    this.totalPrice = itemsTotal;
  }
  
  this.lastUpdated = new Date();
  next();
});

// Méthode pour ajouter un article
cartSchema.methods.addItem = async function(product, quantity = 1, options = {}) {
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === product._id.toString() &&
    item.color === options.color &&
    item.size === options.size
  );
  
  if (existingItemIndex > -1) {
    // Mettre à jour la quantité
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Ajouter un nouvel article
    this.items.push({
      product: product._id,
      name: product.name,
      price: product.discountedPrice || product.price,
      quantity,
      image: product.images && product.images[0] ? product.images[0].url : '',
      color: options.color,
      size: options.size
    });
  }
  
  return this.save();
};

// Méthode pour mettre à jour la quantité
cartSchema.methods.updateQuantity = async function(productId, quantity, options = {}) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId &&
    item.color === options.color &&
    item.size === options.size
  );
  
  if (itemIndex > -1) {
    if (quantity <= 0) {
      // Supprimer l'article si quantité <= 0
      this.items.splice(itemIndex, 1);
    } else {
      // Mettre à jour la quantité
      this.items[itemIndex].quantity = quantity;
    }
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

// Méthode pour supprimer un article
cartSchema.methods.removeItem = async function(productId, options = {}) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId &&
    item.color === options.color &&
    item.size === options.size
  );
  
  if (itemIndex > -1) {
    this.items.splice(itemIndex, 1);
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

// Méthode pour vider le panier
cartSchema.methods.clearCart = async function() {
  this.items = [];
  return this.save();
};

// Méthode pour appliquer un coupon
cartSchema.methods.applyCoupon = async function(couponCode, discount, discountType = 'percentage') {
  this.coupon = {
    code: couponCode,
    discount: Number(discount),
    discountType
  };
  
  return this.save();
};

// Méthode pour supprimer le coupon
cartSchema.methods.removeCoupon = async function() {
  this.coupon = undefined;
  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
