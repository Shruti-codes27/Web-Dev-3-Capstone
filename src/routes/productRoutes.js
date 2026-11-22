const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts
} = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

// Public catalog routes
router.get('/', getProducts);
router.get('/seller/me', protect, authorize(ROLES.SELLER), getSellerProducts);
router.get('/:id', getProductById);

// Seller & Admin product listing management
router.post('/', protect, authorize(ROLES.SELLER, ROLES.ADMIN), createProduct);
router.patch('/:id', protect, authorize(ROLES.SELLER, ROLES.ADMIN), updateProduct);
router.delete('/:id', protect, authorize(ROLES.SELLER, ROLES.ADMIN), deleteProduct);

module.exports = router;
