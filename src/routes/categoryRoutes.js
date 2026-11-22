const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin-only management routes
router.post('/', protect, authorize(ROLES.ADMIN), createCategory);
router.put('/:id', protect, authorize(ROLES.ADMIN), updateCategory);
router.delete('/:id', protect, authorize(ROLES.ADMIN), deleteCategory);

module.exports = router;
