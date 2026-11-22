require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Cart = require('./src/models/Cart');
const Order = require('./src/models/Order');
const Coupon = require('./src/models/Coupon');
const Review = require('./src/models/Review');
const { ROLES, ORDER_STATUS, PAYMENT_STATUS } = require('./src/constants/roles');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Seed] Connected. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Coupon.deleteMany({}),
      Review.deleteMany({})
    ]);

    console.log('[Seed] Inserting Users...');
    // 1. Users
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@ecommerce.local',
      password: 'admin123',
      role: ROLES.ADMIN,
      phone: '9876543210',
      address: {
        street: '100 Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001'
      }
    });

    const seller1 = await User.create({
      name: 'Apex Electronics Store',
      email: 'seller.tech@ecommerce.local',
      password: 'seller123',
      role: ROLES.SELLER,
      phone: '9876543211',
      address: {
        street: '42 Silicon Avenue',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500081'
      }
    });

    const seller2 = await User.create({
      name: 'Urban Vogue Fashion',
      email: 'seller.fashion@ecommerce.local',
      password: 'seller123',
      role: ROLES.SELLER,
      phone: '9876543212',
      address: {
        street: '15 Fashion Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001'
      }
    });

    const customer1 = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul.customer@example.com',
      password: 'customer123',
      role: ROLES.CUSTOMER,
      phone: '9876543213',
      address: {
        street: '7 Green Meadows',
        city: 'Pune',
        state: 'Maharashtra',
        zipCode: '411001'
      }
    });

    const customer2 = await User.create({
      name: 'Priya Patel',
      email: 'priya.customer@example.com',
      password: 'customer123',
      role: ROLES.CUSTOMER,
      phone: '9876543214',
      address: {
        street: '22 Lotus Colony',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380015'
      }
    });

    const customer3 = await User.create({
      name: 'Amit Verma',
      email: 'amit.customer@example.com',
      password: 'customer123',
      role: ROLES.CUSTOMER,
      phone: '9876543215',
      address: {
        street: '88 Civil Lines',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110054'
      }
    });

    // Carts for customers
    await Promise.all([
      Cart.create({ user: customer1._id, items: [] }),
      Cart.create({ user: customer2._id, items: [] }),
      Cart.create({ user: customer3._id, items: [] })
    ]);

    console.log('[Seed] Inserting Categories...');
    // 2. Categories
    const catElectronics = await Category.create({
      name: 'Electronics & Gadgets',
      slug: 'electronics',
      description: 'Laptops, smartphones, audio peripherals, and accessories'
    });

    const catFashion = await Category.create({
      name: 'Fashion & Apparel',
      slug: 'fashion',
      description: 'Designer apparel, casual wear, and footwear'
    });

    const catHome = await Category.create({
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Cookware, appliances, and smart home essentials'
    });

    const catBooks = await Category.create({
      name: 'Books & Learning',
      slug: 'books',
      description: 'Technical, non-fiction, and academic literature'
    });

    console.log('[Seed] Inserting Products with inventory levels...');
    // 3. Products
    const products = await Product.create([
      {
        name: 'Pro Wireless Noise-Cancelling Headphones',
        description: 'Over-ear premium Bluetooth headphones with 40h battery life and active noise cancelling.',
        price: 8999,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 25,
        lowStockThreshold: 5,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500']
      },
      {
        name: 'Ultra-Fast Gaming Mouse 16000 DPI',
        description: 'Ergonomic optical sensor RGB mouse with programmable macro keys.',
        price: 2499,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 3, // Low stock on purpose to trigger alerts
        lowStockThreshold: 5,
        images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500']
      },
      {
        name: 'Mechanical RGB Gaming Keyboard',
        description: 'Tenkeyless tactile mechanical switches with aluminium backplate and detachable Type-C cable.',
        price: 4599,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 15,
        lowStockThreshold: 5,
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500']
      },
      {
        name: '4K Ultra HD Action Camera',
        description: 'Waterproof sports action cam with dual screens and electronic image stabilization.',
        price: 11999,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 1, // Critical low stock
        lowStockThreshold: 4,
        images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500']
      },
      {
        name: 'Classic Indigo Denim Jacket',
        description: 'Authentic 100% cotton premium denim jacket with vintage button wash finish.',
        price: 2999,
        category: catFashion._id,
        seller: seller2._id,
        stock: 18,
        lowStockThreshold: 6,
        images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500']
      },
      {
        name: 'Breathable Running Athletic Shoes',
        description: 'Lightweight cushioned sole footwear engineered for marathons and gym training.',
        price: 3499,
        category: catFashion._id,
        seller: seller2._id,
        stock: 12,
        lowStockThreshold: 4,
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500']
      },
      {
        name: 'Slim-Fit Linen Casual Shirt',
        description: 'Breathable pure organic linen summer shirt with mandarin collar.',
        price: 1899,
        category: catFashion._id,
        seller: seller2._id,
        stock: 4, // Below low stock threshold
        lowStockThreshold: 5,
        images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500']
      },
      {
        name: 'Stainless Steel Insulated Smart Flask 750ml',
        description: 'Vacuum insulated water bottle with touch LED temperature display.',
        price: 999,
        category: catHome._id,
        seller: seller1._id,
        stock: 50,
        lowStockThreshold: 10,
        images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500']
      },
      {
        name: 'System Design & Distributed Systems Handbook',
        description: 'Comprehensive architectural patterns, microservices, and high-scale case studies.',
        price: 1299,
        category: catBooks._id,
        seller: seller2._id,
        stock: 30,
        lowStockThreshold: 8,
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500']
      },
      {
        name: 'Ergonomic Memory Foam Lumbar Support Cushion',
        description: 'Orthopedic posture support pillow designed for office desk chairs.',
        price: 1499,
        category: catHome._id,
        seller: seller2._id,
        stock: 0, // Out of stock to test boundary check
        lowStockThreshold: 5,
        images: ['https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500']
      }
    ]);

    console.log('[Seed] Inserting Coupons...');
    // 4. Coupons
    const coupon1 = await Coupon.create({
      code: 'WELCOME50',
      discountType: 'percentage',
      discountValue: 20,
      minPurchase: 1000,
      maxDiscount: 500,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 50
    });

    const coupon2 = await Coupon.create({
      code: 'FLAT200',
      discountType: 'fixed',
      discountValue: 200,
      minPurchase: 1500,
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      usageLimit: 100
    });

    console.log('[Seed] Inserting Initial Completed Orders for Analytics...');
    // 5. Initial Orders
    const order1 = await Order.create({
      customer: customer1._id,
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          price: products[0].price,
          quantity: 1,
          seller: seller1._id
        },
        {
          product: products[7]._id,
          name: products[7].name,
          price: products[7].price,
          quantity: 2,
          seller: seller1._id
        }
      ],
      subtotal: 8999 + 999 * 2,
      discount: 200,
      totalAmount: 8999 + 999 * 2 - 200,
      status: ORDER_STATUS.DELIVERED,
      statusHistory: [
        { status: ORDER_STATUS.CONFIRMED, updatedBy: customer1._id, comment: 'Order placed' },
        { status: ORDER_STATUS.PROCESSING, updatedBy: seller1._id, comment: 'Dispatched to warehouse' },
        { status: ORDER_STATUS.SHIPPED, updatedBy: seller1._id, comment: 'Courier tracking #IN102938' },
        { status: ORDER_STATUS.DELIVERED, updatedBy: admin._id, comment: 'Delivered to customer' }
      ],
      shippingAddress: customer1.address,
      paymentDetails: {
        method: 'upi',
        transactionId: 'SIM_TXN_SEED_001',
        status: PAYMENT_STATUS.COMPLETED,
        isSimulated: true,
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    });

    const order2 = await Order.create({
      customer: customer2._id,
      items: [
        {
          product: products[4]._id,
          name: products[4].name,
          price: products[4].price,
          quantity: 1,
          seller: seller2._id
        }
      ],
      subtotal: 2999,
      discount: 0,
      totalAmount: 2999,
      status: ORDER_STATUS.CONFIRMED,
      statusHistory: [
        { status: ORDER_STATUS.CONFIRMED, updatedBy: customer2._id, comment: 'Order placed' }
      ],
      shippingAddress: customer2.address,
      paymentDetails: {
        method: 'credit_card',
        transactionId: 'SIM_TXN_SEED_002',
        status: PAYMENT_STATUS.COMPLETED,
        isSimulated: true,
        paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    console.log('[Seed] Inserting Sample Reviews...');
    // 6. Review
    await Review.create({
      user: customer1._id,
      product: products[0]._id,
      rating: 5,
      comment: 'Superb sound quality and crisp active noise cancellation. Totally worth the price!'
    });

    console.log('===============================================================');
    console.log('  Database Seeding Completed Successfully!                    ');
    console.log('===============================================================');
    console.log('Default Credentials:');
    console.log('  Admin:    admin@ecommerce.local          / password: admin123');
    console.log('  Seller 1: seller.tech@ecommerce.local    / password: seller123');
    console.log('  Seller 2: seller.fashion@ecommerce.local / password: seller123');
    console.log('  Customer: rahul.customer@example.com     / password: customer123');
    console.log('  Customer: priya.customer@example.com     / password: customer123');
    console.log('Coupons:    WELCOME50, FLAT200');
    console.log('===============================================================');

    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error during seeding: ${error.message}`);
    process.exit(1);
  }
};

seedData();
