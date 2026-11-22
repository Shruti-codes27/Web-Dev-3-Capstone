const express = require('express');
const router = express.Router();
const {
  getSalesSummary,
  getTopSellingProducts,
  getInventorySummary
} = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

// Analytics reports are restricted to Sellers and Admins
router.use(protect, authorize(ROLES.SELLER, ROLES.ADMIN));

router.get('/sales-summary', getSalesSummary);
router.get('/top-products', getTopSellingProducts);
router.get('/inventory', getInventorySummary);

module.exports = router;
