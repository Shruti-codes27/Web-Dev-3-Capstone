const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../src/app');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const setupEventHandlers = require('../src/events/orderEvents');
const { ROLES } = require('../constants/roles');

describe('E-Commerce & Inventory Management System Test Suite', () => {
  let customerToken;
  let sellerAToken;
  let sellerBToken;
  let adminToken;
  let testCategory;
  let testProductA;
  let testProductLowStock;

  before(async () => {
    process.env.NODE_ENV = 'test';
    setupEventHandlers();

    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Clean test DB
    await Promise.all([
      User.deleteMany({ email: /@test\.com$/ }),
      Category.deleteMany({ slug: /test-/ }),
      Product.deleteMany({ name: /Test Product/ }),
      Cart.deleteMany({}),
      Order.deleteMany({})
    ]);

    // Setup Test Roles
    const adminUser = await User.create({
      name: 'Admin Tester',
      email: 'admin@test.com',
      password: 'password123',
      role: ROLES.ADMIN
    });

    const sellerAUser = await User.create({
      name: 'Seller A',
      email: 'sellera@test.com',
      password: 'password123',
      role: ROLES.SELLER
    });

    const sellerBUser = await User.create({
      name: 'Seller B',
      email: 'sellerb@test.com',
      password: 'password123',
      role: ROLES.SELLER
    });

    const customerUser = await User.create({
      name: 'Customer One',
      email: 'customer@test.com',
      password: 'password123',
      role: ROLES.CUSTOMER
    });

    await Cart.create({ user: customerUser._id, items: [] });

    // Generate tokens via login API
    const resAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'password123'
    });
    adminToken = resAdmin.body.data.accessToken;

    const resSellerA = await request(app).post('/api/auth/login').send({
      email: 'sellera@test.com',
      password: 'password123'
    });
    sellerAToken = resSellerA.body.data.accessToken;

    const resSellerB = await request(app).post('/api/auth/login').send({
      email: 'sellerb@test.com',
      password: 'password123'
    });
    sellerBToken = resSellerB.body.data.accessToken;

    const resCustomer = await request(app).post('/api/auth/login').send({
      email: 'customer@test.com',
      password: 'password123'
    });
    customerToken = resCustomer.body.data.accessToken;

    // Create Category
    testCategory = await Category.create({
      name: 'Test Category Electronics',
      slug: 'test-category-electronics'
    });

    // Create Products
    testProductA = await Product.create({
      name: 'Test Product A (Owned by Seller A)',
      description: 'Test description',
      price: 1000,
      category: testCategory._id,
      seller: sellerAUser._id,
      stock: 10,
      lowStockThreshold: 3
    });

    testProductLowStock = await Product.create({
      name: 'Test Product Low Stock (Owned by Seller A)',
      description: 'Limited stock for testing',
      price: 500,
      category: testCategory._id,
      seller: sellerAUser._id,
      stock: 2,
      lowStockThreshold: 3
    });
  });

  after(async () => {
    await Promise.all([
      User.deleteMany({ email: /@test\.com$/ }),
      Category.deleteMany({ slug: /test-/ }),
      Product.deleteMany({ name: /Test Product/ }),
      Cart.deleteMany({}),
      Order.deleteMany({})
    ]);
    await mongoose.connection.close();
  });

  // --- Requirement 1: Successful request with valid input ---
  it('1. [Success] should register a new customer with valid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Registered Customer',
        email: 'newcustomer@test.com',
        password: 'password123',
        role: 'customer'
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.strictEqual(res.body.data.user.email, 'newcustomer@test.com');
  });

  // --- Requirement 2: Validation failure with missing or invalid fields ---
  it('2. [Validation Failure] should return 400 when registering with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Incomplete User',
        email: 'incomplete@test.com'
      });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  // --- Requirement 3: Request for a resource that does not exist ---
  it('3. [Resource Not Found] should return 404 for non-existent product ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app).get(`/api/products/${fakeId}`);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Product not found.');
  });

  // --- Requirement 4: Request without a valid authentication token ---
  it('4. [Unauthorized] should return 401 when accessing protected route without token', async () => {
    const res = await request(app).get('/api/users/me');

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  // --- Requirement 5: Request by authenticated user with insufficient role permissions ---
  it('5. [Forbidden / RBAC] should return 403 when customer tries to create a category (admin-only)', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Unauthorized Customer Category'
      });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  // --- Requirement 6: Duplicate or conflicting request ---
  it('6. [Conflict] should return 409 when registering with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Attempt',
        email: 'customer@test.com', // Already registered in before()
        password: 'password123'
      });

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.success, false);
  });

  // --- Requirement 7a: Business Rule - Seller cannot modify another seller's product ---
  it('7a. [Business Rule: Seller Isolation] Seller B cannot modify Seller A product', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProductA._id}`)
      .set('Authorization', `Bearer ${sellerBToken}`)
      .send({
        price: 99999
      });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /not authorized to update another seller’s product/i);
  });

  // --- Requirement 7b: Business Rule - Prevent stock from becoming negative & Cart Validation ---
  it('7b. [Business Rule: Stock Protection] should reject adding more items than available stock', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: testProductLowStock._id.toString(),
        quantity: 10 // Only 2 in stock!
      });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Available stock is 2/i);
  });

  // --- Requirement 7c: Business Rule - Atomic Checkout & Stock Decrement ---
  it('7c. [Business Rule: Atomic Order Checkout] should atomically deduct stock upon order placement', async () => {
    // Add valid quantity (1 item of testProductA with stock 10)
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: testProductA._id.toString(),
        quantity: 2
      });

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shippingAddress: {
          street: '123 Test St',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001'
        },
        paymentMethod: 'upi'
      });

    assert.strictEqual(checkoutRes.statusCode, 201);
    assert.strictEqual(checkoutRes.body.success, true);
    assert.strictEqual(checkoutRes.body.data.status, 'confirmed');

    // Verify stock is now 8 (10 - 2)
    const freshProduct = await Product.findById(testProductA._id);
    assert.strictEqual(freshProduct.stock, 8);
  });

  // --- Requirement 7d: Business Rule - Stock Restoration upon Cancellation ---
  it('7d. [Business Rule: Order Cancellation] should restore stock atomically when order is cancelled', async () => {
    // Get customer's orders
    const myOrdersRes = await request(app)
      .get('/api/orders/me')
      .set('Authorization', `Bearer ${customerToken}`);

    const latestOrder = myOrdersRes.body.data[0];
    assert.ok(latestOrder);

    // Cancel order
    const cancelRes = await request(app)
      .post(`/api/orders/${latestOrder._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Changed mind' });

    assert.strictEqual(cancelRes.statusCode, 200);
    assert.strictEqual(cancelRes.body.data.status, 'cancelled');

    // Verify stock restored back to 10
    const restoredProduct = await Product.findById(testProductA._id);
    assert.strictEqual(restoredProduct.stock, 10);
  });
});
