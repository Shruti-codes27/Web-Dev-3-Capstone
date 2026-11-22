const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Helper to calculate cart totals based strictly on live server product prices
const calculateCartTotals = async (cart) => {
  let subtotal = 0;
  let totalItems = 0;
  const itemsWithStatus = [];

  for (const item of cart.items) {
    if (!item.product) continue;

    const liveProduct = item.product;
    const isAvailable = liveProduct.isActive && liveProduct.stock >= item.quantity;
    const itemTotal = liveProduct.price * item.quantity;

    subtotal += itemTotal;
    totalItems += item.quantity;

    itemsWithStatus.push({
      product: {
        _id: liveProduct._id,
        name: liveProduct.name,
        price: liveProduct.price,
        stock: liveProduct.stock,
        images: liveProduct.images,
        category: liveProduct.category
      },
      quantity: item.quantity,
      itemTotal,
      isAvailable,
      stockWarning:
        liveProduct.stock < item.quantity
          ? `Only ${liveProduct.stock} items remaining in stock`
          : null
    });
  }

  // Calculate discount if coupon applied
  let discount = 0;
  let couponInfo = null;
  if (cart.couponApplied) {
    const coupon = await Coupon.findById(cart.couponApplied);
    if (coupon && coupon.isValid(subtotal).valid) {
      discount = coupon.calculateDiscount(subtotal);
      couponInfo = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount
      };
    }
  }

  const finalTotal = Math.max(0, subtotal - discount);

  return {
    items: itemsWithStatus,
    totalItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    couponInfo
  };
};

// @desc    Get customer's cart
// @route   GET /api/cart
// @access  Private (Customer)
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      populate: { path: 'category', select: 'name' }
    });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const calculatedCart = await calculateCartTotals(cart);

    res.status(200).json({
      success: true,
      data: calculatedCart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to cart or increment quantity
// @route   POST /api/cart/items
// @access  Private (Customer)
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required.'
      });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer.'
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or is currently unavailable.'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    const targetQuantity = existingIndex > -1 ? cart.items[existingIndex].quantity + qty : qty;

    if (product.stock < targetQuantity) {
      return res.status(400).json({
        success: false,
        message: `Cannot add ${qty} item(s). Available stock is ${product.stock}.`
      });
    }

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = targetQuantity;
    } else {
      cart.items.push({ product: productId, quantity: qty });
    }

    await cart.save();
    await cart.populate('items.product');
    const calculatedCart = await calculateCartTotals(cart);

    res.status(200).json({
      success: true,
      message: 'Product added to cart.',
      data: calculatedCart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quantity of specific cart item
// @route   PATCH /api/cart/items/:productId
// @access  Private (Customer)
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer.'
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable.'
      });
    }

    if (product.stock < qty) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock}).`
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found.'
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product is not in your cart.'
      });
    }

    cart.items[itemIndex].quantity = qty;
    await cart.save();
    await cart.populate('items.product');

    const calculatedCart = await calculateCartTotals(cart);

    res.status(200).json({
      success: true,
      message: 'Cart item quantity updated.',
      data: calculatedCart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove an item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private (Customer)
exports.removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found.'
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId.toString()
    );

    await cart.save();
    await cart.populate('items.product');
    const calculatedCart = await calculateCartTotals(cart);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: calculatedCart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private (Customer)
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      cart.couponApplied = null;
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.'
    });
  } catch (error) {
    next(error);
  }
};
