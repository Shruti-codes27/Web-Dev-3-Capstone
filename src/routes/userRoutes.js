const express = require('express');
const router = express.Router();
const {
  getMe,
  updateMe,
  getAllUsers,
  updateUserStatus
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

// Admin user management routes
router.get('/', protect, authorize(ROLES.ADMIN), getAllUsers);
router.patch('/:id/status', protect, authorize(ROLES.ADMIN), updateUserStatus);

module.exports = router;
