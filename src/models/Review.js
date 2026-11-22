const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    rating: {
      type: Number,
      required: [true, 'Please rate between 1 and 5 stars'],
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: [true, 'Please add review comments'],
      maxlength: [500, 'Review cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

// One review per customer per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static method to recalculate product average rating
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        numReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  const Product = mongoose.model('Product');
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      numReviews: stats[0].numReviews,
      averageRating: Math.round(stats[0].averageRating * 10) / 10
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      numReviews: 0,
      averageRating: 0
    });
  }
};

reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.product);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.product);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
