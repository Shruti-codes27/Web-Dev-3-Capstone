const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../constants/roles');

const orderItemSchema = new mongoose.Schema(
  {
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
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(val) => val.length > 0, 'Order must contain at least one item']
    },
    subtotal: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.CONFIRMED
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now },
        comment: { type: String, default: '' }
      }
    ],
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'India' }
    },
    paymentDetails: {
      method: {
        type: String,
        enum: ['credit_card', 'debit_card', 'upi', 'netbanking', 'cod'],
        default: 'upi'
      },
      transactionId: {
        type: String,
        default: () => `TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      },
      status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.COMPLETED
      },
      isSimulated: {
        type: Boolean,
        default: true
      },
      paidAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ 'items.seller': 1, status: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
