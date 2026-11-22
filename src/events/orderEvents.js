const { appEventEmitter, APP_EVENTS } = require('./eventEmitter');
const { getIO } = require('../sockets/socketManager');

const setupEventHandlers = () => {
  // 1. Order Placed Listener
  appEventEmitter.on(APP_EVENTS.ORDER_PLACED, ({ order, customerId, sellerIds }) => {
    console.log(`[EventBus] ${APP_EVENTS.ORDER_PLACED} triggered for Order ID: ${order._id}`);
    const io = getIO();
    if (!io) return;

    // Notify Customer
    io.to(`customer_${customerId}`).emit('order:confirmation', {
      message: 'Your order has been placed successfully!',
      orderId: order._id,
      totalAmount: order.totalAmount,
      status: order.status,
      timestamp: new Date()
    });

    // Notify each relevant seller
    if (Array.isArray(sellerIds)) {
      sellerIds.forEach((sellerId) => {
        io.to(`seller_${sellerId}`).emit('seller:new_order', {
          message: 'You have received a new customer order!',
          orderId: order._id,
          createdAt: order.createdAt
        });
      });
    }

    // Notify Admins
    io.to('admin_room').emit('admin:order_created', {
      message: 'New platform order created',
      orderId: order._id,
      totalAmount: order.totalAmount
    });
  });

  // 2. Order Status Updated Listener
  appEventEmitter.on(APP_EVENTS.ORDER_STATUS_UPDATED, ({ order, previousStatus }) => {
    console.log(`[EventBus] ${APP_EVENTS.ORDER_STATUS_UPDATED} Order ID: ${order._id} (${previousStatus} -> ${order.status})`);
    const io = getIO();
    if (!io) return;

    // Notify Customer
    io.to(`customer_${order.customer._id || order.customer}`).emit('order:status_change', {
      orderId: order._id,
      previousStatus,
      currentStatus: order.status,
      updatedAt: order.updatedAt || new Date()
    });
  });

  // 3. Low Stock Alert Listener
  appEventEmitter.on(APP_EVENTS.STOCK_LOW, ({ productId, productName, stock, threshold, sellerId }) => {
    console.warn(`[EventBus] [ALERT] Low stock detected for product "${productName}" (ID: ${productId}). Current Stock: ${stock}, Threshold: ${threshold}`);
    const io = getIO();
    if (!io) return;

    // Send warning to the product's seller
    if (sellerId) {
      io.to(`seller_${sellerId}`).emit('inventory:low_stock_alert', {
        productId,
        productName,
        stock,
        threshold,
        alertTime: new Date()
      });
    }

    // Send to admin room as well
    io.to('admin_room').emit('admin:low_stock_warning', {
      productId,
      productName,
      stock,
      threshold,
      sellerId
    });
  });

  // 4. Order Cancelled Listener
  appEventEmitter.on(APP_EVENTS.ORDER_CANCELLED, ({ order }) => {
    console.log(`[EventBus] ${APP_EVENTS.ORDER_CANCELLED} Order ID: ${order._id}`);
    const io = getIO();
    if (!io) return;

    io.to(`customer_${order.customer._id || order.customer}`).emit('order:cancelled', {
      orderId: order._id,
      message: 'Your order was cancelled and stock has been restored.'
    });
  });
};

module.exports = setupEventHandlers;
