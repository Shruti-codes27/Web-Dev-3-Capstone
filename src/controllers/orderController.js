const orderService = require('../services/orderService');
const Order = require('../models/Order');
const { ROLES, ORDER_STATUS } = require('../constants/roles');
const { appEventEmitter, APP_EVENTS } = require('../events/eventEmitter');

// Defined state machine for order status transitions
const ALLOWED_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: []
};

// @desc    Checkout cart and create new order (Atomic stock deduction + simulated payment)
// @route   POST /api/orders/checkout
// @access  Private (Customer)
exports.checkout = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address (street, city, zipCode) is required.'
      });
    }

    const order = await orderService.processCheckout(req.user._id, {
      shippingAddress,
      paymentMethod,
      couponCode
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Payment simulated.',
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get order history of current customer
// @route   GET /api/orders/me
// @access  Private (Customer)
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const total = await Order.countDocuments({ customer: req.user._id });
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      },
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private (Customer/Seller/Admin)
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.seller', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Role-based authorization check
    if (req.user.role === ROLES.CUSTOMER) {
      if (order.customer._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot view another customer’s order.'
        });
      }
    } else if (req.user.role === ROLES.SELLER) {
      const isSellerItemInOrder = order.items.some(
        (item) => item.seller._id.toString() === req.user._id.toString()
      );
      if (!isSellerItemInOrder) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This order does not contain items from your store.'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status according to business rules
// @route   PATCH /api/orders/:id/status
// @access  Private (Seller/Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, comment } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Authorization: seller can only update if order has their products
    if (req.user.role === ROLES.SELLER) {
      const ownsItems = order.items.some(
        (item) => item.seller.toString() === req.user._id.toString()
      );
      if (!ownsItems) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot modify orders that do not contain your items.'
        });
      }
    }

    // Validate status transition
    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${order.status}' to '${status}'. Allowed transitions: [${allowedNextStatuses.join(', ')}]`
      });
    }

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      status,
      updatedBy: req.user._id,
      comment: comment || `Status updated to ${status}`
    });

    await order.save();

    // Trigger internal event & real-time notification
    appEventEmitter.emit(APP_EVENTS.ORDER_STATUS_UPDATED, {
      order,
      previousStatus
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'.`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order and automatically restore stock
// @route   POST /api/orders/:id/cancel
// @access  Private (Customer/Admin)
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await orderService.cancelOrder(
      req.params.id,
      req.user._id,
      req.user.role,
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Order successfully cancelled and inventory stock restored.',
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get orders containing products assigned to the logged in seller
// @route   GET /api/orders/seller/me
// @access  Private (Seller only)
exports.getSellerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ 'items.seller': req.user._id })
      .populate('customer', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};
