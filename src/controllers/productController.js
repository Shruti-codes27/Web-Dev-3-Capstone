const Product = require('../models/Product');
const Category = require('../models/Category');
const { ROLES } = require('../constants/roles');

// @desc    Get all products with search, filter, sort, pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page = 1,
      limit = 10
    } = req.query;

    const query = { isActive: true };

    // Search by text keyword
    if (q) {
      query.$text = { $search: q };
    }

    // Filter by Category (id or slug)
    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const catDoc = await Category.findOne({ slug: category.toLowerCase() });
        if (catDoc) {
          query.category = catDoc._id;
        }
      }
    }

    // Filter by Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filter by in-stock status
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'rating') sortOption = { averageRating: -1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1 };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('seller', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      },
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product details
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug description')
      .populate('seller', 'name email phone');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product listing
// @route   POST /api/products
// @access  Private (Seller/Admin)
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      lowStockThreshold,
      images,
      sellerId
    } = req.body;

    if (!name || !description || price === undefined || !category || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, description, price, category, stock.'
      });
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID provided.'
      });
    }

    // Determine seller: seller assigns themselves, admin can optionally specify sellerId
    let seller = req.user._id;
    if (req.user.role === ROLES.ADMIN && sellerId) {
      seller = sellerId;
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category,
      seller,
      stock: Number(stock),
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
      images: images || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Product listing created successfully.',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product listing
// @route   PATCH /api/products/:id
// @access  Private (Owner Seller / Admin)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    // Business Rule: A seller must not modify products owned by another seller
    if (
      req.user.role === ROLES.SELLER &&
      product.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update another seller’s product.'
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate a product
// @route   DELETE /api/products/:id
// @access  Private (Owner Seller / Admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    // Business Rule: Check ownership
    if (
      req.user.role === ROLES.SELLER &&
      product.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete another seller’s product.'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products belonging to current seller
// @route   GET /api/products/seller/me
// @access  Private (Seller only)
exports.getSellerProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};
