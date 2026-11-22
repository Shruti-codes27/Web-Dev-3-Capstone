const User = require('../models/User');

// @desc    Get logged in user profile
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update logged in user profile
// @route   PATCH /api/users/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'phone', 'address'];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-refreshToken')
      .skip(skip)
      .limit(parseInt(limit, 10))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total: totalUsers,
        page: parseInt(page, 10),
        pages: Math.ceil(totalUsers / parseInt(limit, 10))
      },
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user active status (Admin only)
// @route   PATCH /api/users/:id/status
// @access  Private (Admin)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Please provide isActive as a boolean value.'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: `User has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
