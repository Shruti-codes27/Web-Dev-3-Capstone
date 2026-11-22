const reportService = require('../services/reportService');
const { ROLES } = require('../constants/roles');

// @desc    Get Sales Summary analytics
// @route   GET /api/reports/sales-summary
// @access  Private (Seller/Admin)
exports.getSalesSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    // If user is a seller, scope the report strictly to their sellerId
    const sellerId = req.user.role === ROLES.SELLER ? req.user._id : req.query.sellerId;

    const data = await reportService.getSalesSummary({
      startDate,
      endDate,
      sellerId
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Best-Selling Products ranking
// @route   GET /api/reports/top-products
// @access  Private (Seller/Admin)
exports.getTopSellingProducts = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const sellerId = req.user.role === ROLES.SELLER ? req.user._id : req.query.sellerId;

    const data = await reportService.getTopSellingProducts({
      limit,
      sellerId
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Inventory and Low-Stock summary
// @route   GET /api/reports/inventory
// @access  Private (Seller/Admin)
exports.getInventorySummary = async (req, res, next) => {
  try {
    const sellerId = req.user.role === ROLES.SELLER ? req.user._id : req.query.sellerId;

    const data = await reportService.getInventorySummary({
      sellerId
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
