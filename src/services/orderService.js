const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const { appEventEmitter, APP_EVENTS } = require('../events/eventEmitter');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../constants/roles');

class OrderService {
  /**
   * Process Checkout with Atomic Inventory Deduction
   */
  async processCheckout(userId, checkoutData) {
    const { shippingAddress, paymentMethod = 'upi', couponCode } = checkoutData;

    // 1. Fetch user's cart
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      throw new Error('Your cart is empty. Please add items before checking out.');
    }

    // 2. Validate current pricing and check inventory availability
    const validatedItems = [];
    let subtotal = 0;
    const sellerIds = new Set();

    for (const cartItem of cart.items) {
      const liveProduct = await Product.findById(cartItem.product._id);
      if (!liveProduct || !liveProduct.isActive) {
        throw new Error(`Product "${cartItem.product.name || 'Unknown'}" is currently unavailable.`);
      }

      if (liveProduct.stock < cartItem.quantity) {
        throw new Error(
          `Insufficient stock for "${liveProduct.name}". Available: ${liveProduct.stock}, Requested: ${cartItem.quantity}`
        );
      }

      const itemTotal = liveProduct.price * cartItem.quantity;
      subtotal += itemTotal;
      sellerIds.add(liveProduct.seller.toString());

      validatedItems.push({
        product: liveProduct._id,
        name: liveProduct.name,
        price: liveProduct.price,
        quantity: cartItem.quantity,
        seller: liveProduct.seller,
        lowStockThreshold: liveProduct.lowStockThreshold
      });
    }

    // 3. Apply coupon discount if provided
    let discount = 0;
    let couponDoc = null;
    if (couponCode) {
      couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      if (couponDoc) {
        const validation = couponDoc.isValid(subtotal);
        if (!validation.valid) {
          throw new Error(validation.message);
        }
        discount = couponDoc.calculateDiscount(subtotal);
      }
    }

    const totalAmount = Math.max(0, subtotal - discount);

    // 4. ATOMIC INVENTORY DEDUCTION (Concurrency-Safe)
    const deductedProducts = [];

    try {
      for (const item of validatedItems) {
        // Atomic decrement with stock guard condition
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stock: { $gte: item.quantity },
            isActive: true
          },
          {
            $inc: { stock: -item.quantity }
          },
          { new: true }
        );

        if (!updatedProduct) {
          throw new Error(
            `Checkout failed: Could not reserve stock for "${item.name}". Item might have just sold out.`
          );
        }

        deductedProducts.push({
          productId: item.product,
          quantity: item.quantity,
          updatedStock: updatedProduct.stock,
          name: item.name,
          threshold: item.lowStockThreshold,
          seller: item.seller
        });
      }
    } catch (concurrencyError) {
      // Rollback any stocks deducted so far in this checkout attempt
      for (const rollbackItem of deductedProducts) {
        await Product.findByIdAndUpdate(rollbackItem.productId, {
          $inc: { stock: rollbackItem.quantity }
        });
      }
      throw concurrencyError;
    }

    // 5. Check for low-stock triggers & emit alerts
    for (const item of deductedProducts) {
      if (item.updatedStock <= item.threshold) {
        appEventEmitter.emit(APP_EVENTS.STOCK_LOW, {
          productId: item.productId,
          productName: item.name,
          stock: item.updatedStock,
          threshold: item.threshold,
          sellerId: item.seller
        });
      }
    }

    // 6. If coupon used, increment its usage counter
    if (couponDoc) {
      couponDoc.timesUsed += 1;
      await couponDoc.save();
    }

    // 7. Create Order snapshot
    const order = await Order.create({
      customer: userId,
      items: validatedItems.map(({ product, name, price, quantity, seller }) => ({
        product,
        name,
        price,
        quantity,
        seller
      })),
      subtotal,
      discount,
      totalAmount,
      status: ORDER_STATUS.CONFIRMED,
      statusHistory: [
        {
          status: ORDER_STATUS.CONFIRMED,
          updatedBy: userId,
          comment: 'Order placed and stock reserved.'
        }
      ],
      shippingAddress,
      paymentDetails: {
        method: paymentMethod,
        transactionId: `SIM_TXN_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`,
        status: PAYMENT_STATUS.COMPLETED,
        isSimulated: true,
        paidAt: new Date()
      }
    });

    // 8. Clear user cart
    cart.items = [];
    cart.couponApplied = null;
    await cart.save();

    // 9. Emit decoupled event
    appEventEmitter.emit(APP_EVENTS.ORDER_PLACED, {
      order,
      customerId: userId,
      sellerIds: Array.from(sellerIds)
    });

    return order;
  }

  /**
   * Cancel Order and Atomically Restore Inventory
   */
  async cancelOrder(orderId, userId, userRole, reason = 'Cancelled by user') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // RBAC: Customer can only cancel their own order; Admins can cancel any order
    if (userRole === 'customer' && order.customer.toString() !== userId.toString()) {
      throw new Error('Unauthorized: You can only cancel your own orders.');
    }

    // Check if order status allows cancellation
    const nonCancellable = [ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];
    if (nonCancellable.includes(order.status)) {
      throw new Error(`Order cannot be cancelled in its current status: '${order.status}'`);
    }

    // 1. Atomically restore stock for all order items
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    // 2. Update order status
    const previousStatus = order.status;
    order.status = ORDER_STATUS.CANCELLED;
    order.paymentDetails.status = PAYMENT_STATUS.REFUNDED;
    order.statusHistory.push({
      status: ORDER_STATUS.CANCELLED,
      updatedBy: userId,
      comment: reason
    });
    await order.save();

    // 3. Emit cancellation event
    appEventEmitter.emit(APP_EVENTS.ORDER_CANCELLED, { order });
    appEventEmitter.emit(APP_EVENTS.ORDER_STATUS_UPDATED, { order, previousStatus });

    return order;
  }
}

module.exports = new OrderService();
