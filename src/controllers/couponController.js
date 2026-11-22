const Coupon = require('../models/Coupon');

// @desc    Validate coupon code against cart amount
// @route   POST /api/coupons/validate
// @access  Private (Customer)
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, cartAmount } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a coupon code.'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code.'
      });
    }

    const validation = coupon.isValid(Number(cartAmount) || 0);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const discountAmount = coupon.calculateDiscount(Number(cartAmount) || 0);

    res.status(200).json({
      success: true,
      message: 'Coupon is valid and applied.',
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalAmount: Math.max(0, (Number(cartAmount) || 0) - discountAmount)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new coupon (Admin only)
// @route   POST /api/coupons
// @access  Private (Admin)
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      validUntil,
      usageLimit
    } = req.body;

    if (!code || !discountValue || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'code, discountValue, and validUntil date are required.'
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minPurchase: minPurchase ? Number(minPurchase) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      validUntil: new Date(validUntil),
      usageLimit: usageLimit ? Number(usageLimit) : 100
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons (Admin only)
// @route   GET /api/coupons
// @access  Private (Admin)
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};
