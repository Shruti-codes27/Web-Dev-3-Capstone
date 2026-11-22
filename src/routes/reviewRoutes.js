const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createReview,
  getProductReviews
} = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

router.get('/:productId/reviews', getProductReviews);
router.post(
  '/:productId/reviews',
  protect,
  authorize(ROLES.CUSTOMER),
  createReview
);

module.exports = router;
