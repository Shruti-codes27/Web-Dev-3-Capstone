const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { ORDER_STATUS } = require('../constants/roles');

// @desc    Add review for a product (Customer only, verified purchase)
// @route   POST /api/products/:productId/reviews
// @access  Private (Customer)
exports.createReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const { productId } = req.params;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Rating and comment are required.'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    // Check if customer actually purchased this product in a delivered or completed order
    const hasPurchased = await Order.findOne({
      customer: req.user._id,
      'items.product': productId,
      status: { $in: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED] }
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products that you have ordered.'
      });
    }

    // Check for existing review
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: productId
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this product.'
      });
    }

    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating: Number(rating),
      comment
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
exports.getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};
