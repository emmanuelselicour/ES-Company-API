const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name price images stock status')
      .exec();
    
    if (!cart) {
      // Créer un panier vide si aucun n'existe
      cart = await Cart.create({ 
        user: req.user.id,
        items: []
      });
    }
    
    // Vérifier la disponibilité des produits
    const updatedItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      
      if (!product || product.status !== 'active') {
        // Produit indisponible, on le supprime
        await cart.removeItem(item.product._id, {
          color: item.color,
          size: item.size
        });
      } else if (product.stock < item.quantity) {
        // Ajuster la quantité si stock insuffisant
        item.quantity = Math.min(item.quantity, product.stock);
        updatedItems.push({
          productId: item.product._id,
          color: item.color,
          size: item.size,
          quantity: item.quantity
        });
      }
    }
    
    // Mettre à jour les quantités si nécessaire
    if (updatedItems.length > 0) {
      for (const update of updatedItems) {
        await cart.updateQuantity(update.productId, update.quantity, {
          color: update.color,
          size: update.size
        });
      }
      cart = await Cart.findById(cart._id)
        .populate('items.product', 'name price images stock status')
        .exec();
    }
    
    res.json({
      status: 'success',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Get cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, color, size } = req.body;
    
    // Validation
    if (!productId) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID is required'
      });
    }
    
    // Vérifier le produit
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    if (product.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Product is not available'
      });
    }
    
    // Vérifier le stock
    if (product.stock < quantity) {
      return res.status(400).json({
        status: 'error',
        message: `Only ${product.stock} items available in stock`
      });
    }
    
    // Trouver ou créer le panier
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      cart = await Cart.create({ 
        user: req.user.id,
        items: []
      });
    }
    
    // Ajouter l'article au panier
    await cart.addItem(product, quantity, { color, size });
    
    // Récupérer le panier mis à jour
    cart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock status')
      .exec();
    
    res.json({
      status: 'success',
      message: 'Item added to cart',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, color, size } = req.body;
    
    if (!quantity || quantity < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid quantity is required'
      });
    }
    
    // Vérifier le produit
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    // Vérifier le stock
    if (product.stock < quantity) {
      return res.status(400).json({
        status: 'error',
        message: `Only ${product.stock} items available in stock`
      });
    }
    
    // Trouver le panier
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    // Mettre à jour la quantité
    await cart.updateQuantity(productId, quantity, { color, size });
    
    // Récupérer le panier mis à jour
    cart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock status')
      .exec();
    
    res.json({
      status: 'success',
      message: 'Cart updated',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Update cart error:', error);
    if (error.message === 'Item not found in cart') {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found in cart'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Error updating cart',
      error: error.message
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { color, size } = req.body;
    
    // Trouver le panier
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    // Supprimer l'article
    await cart.removeItem(productId, { color, size });
    
    // Récupérer le panier mis à jour
    cart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock status')
      .exec();
    
    res.json({
      status: 'success',
      message: 'Item removed from cart',
      data: { cart }
    });
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    if (error.message === 'Item not found in cart') {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found in cart'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    await cart.clearCart();
    
    res.json({
      status: 'success',
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error clearing cart',
      error: error.message
    });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Private
exports.applyCoupon = async (req, res) => {
  try {
    const { code, discount, discountType = 'percentage' } = req.body;
    
    if (!code || !discount) {
      return res.status(400).json({
        status: 'error',
        message: 'Coupon code and discount are required'
      });
    }
    
    // Ici, normalement vous vérifieriez la validité du coupon
    // Pour l'exemple, on accepte tous les coupons
    
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    await cart.applyCoupon(code, discount, discountType);
    
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock status')
      .exec();
    
    res.json({
      status: 'success',
      message: 'Coupon applied successfully',
      data: { cart: updatedCart }
    });
  } catch (error) {
    console.error('❌ Apply coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error applying coupon',
      error: error.message
    });
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/cart/coupon
// @access  Private
exports.removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        status: 'error',
        message: 'Cart not found'
      });
    }
    
    await cart.removeCoupon();
    
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock status')
      .exec();
    
    res.json({
      status: 'success',
      message: 'Coupon removed successfully',
      data: { cart: updatedCart }
    });
  } catch (error) {
    console.error('❌ Remove coupon error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error removing coupon',
      error: error.message
    });
  }
};

// @desc    Get cart summary
// @route   GET /api/cart/summary
// @access  Private
exports.getCartSummary = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.json({
        status: 'success',
        data: {
          totalItems: 0,
          totalPrice: 0,
          items: []
        }
      });
    }
    
    res.json({
      status: 'success',
      data: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
        items: cart.items.map(item => ({
          productId: item.product,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          color: item.color,
          size: item.size,
          subtotal: item.price * item.quantity
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get cart summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting cart summary',
      error: error.message
    });
  }
};
