const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../constants/roles');

class ReportService {
  /**
   * 1. Sales Summary Aggregation Pipeline
   */
  async getSalesSummary({ startDate, endDate, sellerId } = {}) {
    const matchStage = {
      status: { $ne: ORDER_STATUS.CANCELLED }
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    if (sellerId) {
      matchStage['items.seller'] = new mongoose.Types.ObjectId(sellerId);
    }

    const summary = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' },
          totalDiscountGiven: { $sum: '$discount' },
          minOrderValue: { $min: '$totalAmount' },
          maxOrderValue: { $max: '$totalAmount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalOrders: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          totalDiscountGiven: { $round: ['$totalDiscountGiven', 2] },
          minOrderValue: 1,
          maxOrderValue: 1
        }
      }
    ]);

    // Daily breakdown pipeline
    const dailyBreakdown = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          dailyRevenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          dailyRevenue: { $round: ['$dailyRevenue', 2] },
          ordersCount: 1
        }
      }
    ]);

    return {
      overview: summary[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalDiscountGiven: 0,
        minOrderValue: 0,
        maxOrderValue: 0
      },
      dailyBreakdown
    };
  }

  /**
   * 2. Best-Selling Products Aggregation Pipeline
   */
  async getTopSellingProducts({ limit = 5, sellerId } = {}) {
    const pipeline = [
      {
        $match: {
          status: { $ne: ORDER_STATUS.CANCELLED }
        }
      },
      { $unwind: '$items' }
    ];

    if (sellerId) {
      pipeline.push({
        $match: {
          'items.seller': new mongoose.Types.ObjectId(sellerId)
        }
      });
    }

    pipeline.push(
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          unitPrice: { $first: '$items.price' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenueGenerated: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] }
          }
        }
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: parseInt(limit, 10) || 5 },
      {
        $project: {
          _id: 1,
          productId: '$_id',
          productName: 1,
          unitPrice: 1,
          totalQuantitySold: 1,
          totalRevenueGenerated: { $round: ['$totalRevenueGenerated', 2] }
        }
      }
    );

    return await Order.aggregate(pipeline);
  }

  /**
   * 3. Inventory Summary & Low-Stock Aggregation Pipeline
   */
  async getInventorySummary({ sellerId } = {}) {
    const matchStage = { isActive: true };
    if (sellerId) {
      matchStage.seller = new mongoose.Types.ObjectId(sellerId);
    }

    const summary = await Product.aggregate([
      { $match: matchStage },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStockQuantity: { $sum: '$stock' },
                totalInventoryValuation: {
                  $sum: { $multiply: ['$stock', '$price'] }
                },
                averageProductPrice: { $avg: '$price' },
                outOfStockCount: {
                  $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
                },
                lowStockCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ['$stock', 0] },
                          { $lte: ['$stock', '$lowStockThreshold'] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            },
            {
              $project: {
                _id: 0,
                totalProducts: 1,
                totalStockQuantity: 1,
                totalInventoryValuation: { $round: ['$totalInventoryValuation', 2] },
                averageProductPrice: { $round: ['$averageProductPrice', 2] },
                outOfStockCount: 1,
                lowStockCount: 1
              }
            }
          ],
          lowStockProducts: [
            {
              $match: {
                $expr: { $lte: ['$stock', '$lowStockThreshold'] }
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                price: 1,
                stock: 1,
                lowStockThreshold: 1,
                seller: 1
              }
            },
            { $sort: { stock: 1 } }
          ]
        }
      }
    ]);

    return {
      overview: summary[0].overview[0] || {
        totalProducts: 0,
        totalStockQuantity: 0,
        totalInventoryValuation: 0,
        averageProductPrice: 0,
        outOfStockCount: 0,
        lowStockCount: 0
      },
      lowStockProducts: summary[0].lowStockProducts || []
    };
  }
}

module.exports = new ReportService();
