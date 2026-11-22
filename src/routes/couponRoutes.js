const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  createCoupon,
  getCoupons
} = require('../controllers/couponController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

router.post('/validate', validateCoupon);
router.post('/', authorize(ROLES.ADMIN), createCoupon);
router.get('/', authorize(ROLES.ADMIN), getCoupons);

module.exports = router;
