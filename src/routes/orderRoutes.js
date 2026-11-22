const express = require('express');
const router = express.Router();
const {
  checkout,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getSellerOrders
} = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// Customer Checkout & History
router.post('/checkout', authorize(ROLES.CUSTOMER), checkout);
router.get('/me', authorize(ROLES.CUSTOMER), getMyOrders);

// Seller Order Management
router.get('/seller/me', authorize(ROLES.SELLER), getSellerOrders);

// Shared / Scoped Order operations
router.get('/:id', getOrderById);
router.patch('/:id/status', authorize(ROLES.SELLER, ROLES.ADMIN), updateOrderStatus);
router.post('/:id/cancel', authorize(ROLES.CUSTOMER, ROLES.ADMIN), cancelOrder);

module.exports = router;
