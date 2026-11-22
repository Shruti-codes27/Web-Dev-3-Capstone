const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please provide coupon code'],
      unique: true,
      uppercase: true,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      required: [true, 'Please provide discount amount or percentage'],
      min: [1, 'Discount value must be at least 1']
    },
    minPurchase: {
      type: Number,
      default: 0,
      min: [0, 'Minimum purchase cannot be negative']
    },
    maxDiscount: {
      type: Number,
      default: null
    },
    validUntil: {
      type: Date,
      required: [true, 'Please provide coupon expiration date']
    },
    usageLimit: {
      type: Number,
      default: 100
    },
    timesUsed: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

couponSchema.methods.isValid = function (purchaseAmount) {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  if (this.validUntil < now) return { valid: false, message: 'Coupon has expired' };
  if (this.timesUsed >= this.usageLimit) return { valid: false, message: 'Coupon usage limit reached' };
  if (purchaseAmount < this.minPurchase) {
    return {
      valid: false,
      message: `Minimum purchase of ₹${this.minPurchase} required for this coupon`
    };
  }
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (purchaseAmount) {
  if (this.discountType === 'percentage') {
    let discount = (purchaseAmount * this.discountValue) / 100;
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
    return Math.round(discount * 100) / 100;
  }
  return Math.min(this.discountValue, purchaseAmount);
};

module.exports = mongoose.model('Coupon', couponSchema);
