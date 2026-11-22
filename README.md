# E-Commerce and Inventory Management System (Backend Capstone)

> **Project 4: Capstone Project Assignment**  
> **Domain:** Retail / E-Commerce Backend  
> **Tech Stack:** Node.js, Express.js, MongoDB (Mongoose), Socket.IO, JWT, bcryptjs, Supertest

---

## 📌 Project Overview
This project is an enterprise-grade RESTful API and real-time backend architecture for an E-Commerce and Concurrent Inventory Management platform. It satisfies all academic capstone requirements by incorporating:

- **Role-Based Access Control (RBAC):** Customer, Seller, and Administrator personas with strict tenant and resource isolation.
- **Server-Authoritative Cart & Checkout:** Real-time stock revalidation, server-side price computation (zero trust in client-submitted prices), and simulated payment workflows.
- **Atomic Concurrency-Safe Inventory Updates:** Mongoose `$inc` and `$gte` atomic guards that prevent overselling and negative inventory even during simultaneous checkout attempts.
- **Dual-Layer Real-Time Event Pipeline:** Internal Node.js `EventEmitter` decoupled from external `Socket.IO` rooms for instant customer order updates, seller new-order notifications, and low-stock alerts.
- **MongoDB Aggregation Pipelines:** Date-wise revenue summaries, top-selling product volume analytics, and low-stock threshold valuations.

---

## 🏗️ Architecture & Folder Structure

```
Web dev Capstone/
├── .env.example                # Environment configuration template
├── .env                        # Local active environment variables
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and npm scripts
├── README.md                   # Setup guide and project documentation
├── Project_Report.md           # Formal Academic Capstone Project Report
├── postman_collection.json     # Comprehensive Postman test collection
├── seed.js                     # Complete database seeding script
├── public/
│   └── socket-client.html      # Real-time Socket.IO demo client interface
├── src/
│   ├── app.js                  # Express application & middleware registration
│   ├── server.js               # HTTP server & Socket.IO initialization
│   ├── config/
│   │   └── db.js               # MongoDB Mongoose connection
│   ├── constants/
│   │   └── roles.js            # User roles, order statuses, payment enums
│   ├── controllers/            # Controller handlers for all endpoints
│   ├── events/                 # EventEmitter and Socket.IO bridge
│   ├── middlewares/            # JWT auth, RBAC permissions, error handlers
│   ├── models/                 # Mongoose schemas (User, Category, Product, Cart, Order, etc.)
│   ├── routes/                 # Express route definitions
│   ├── services/               # Atomic checkout, inventory, and aggregation pipelines
│   └── sockets/                # Socket.IO connection & room manager
└── tests/
    └── api.test.js             # Automated test suite covering the 7 mandatory scenarios
```

---

## ⚙️ Prerequisites & Installation

### 1. Prerequisites
- **Node.js:** v18.x or v20+ (tested on Node v24.14.0)
- **MongoDB:** Local MongoDB Community Server running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas cloud URI.

### 2. Installation Steps
Clone or navigate to the repository directory:
```bash
cd "Web dev Capstone"
```

Install npm dependencies:
```bash
npm install
```

### 3. Environment Variables Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Ensure your `.env` contains the required keys:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce_capstone
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
LOW_STOCK_DEFAULT_THRESHOLD=5
NODE_ENV=development
```

---

## 🚀 Running the Project

### 1. Seed the Database
Populates standard roles (Admin, 2 Sellers, 3 Customers), categories, realistic product inventory, discount coupons, and historical orders:
```bash
npm run seed
```

#### Pre-Configured Test Credentials:
| Persona | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ecommerce.local` | `admin123` | `admin` |
| **Seller 1 (Tech)** | `seller.tech@ecommerce.local` | `seller123` | `seller` |
| **Seller 2 (Fashion)**| `seller.fashion@ecommerce.local` | `seller123` | `seller` |
| **Customer 1** | `rahul.customer@example.com` | `customer123` | `customer` |
| **Customer 2** | `priya.customer@example.com` | `customer123` | `customer` |

---

### 2. Start the Development Server
```bash
npm run dev
# Or for standard production start:
npm start
```
The server will boot on `http://localhost:5000`.

### 3. Access Real-Time Demo Console
Open your browser and navigate to:
```
http://localhost:5000/socket-client.html
```
Connect using a Customer or Seller JWT token (or test custom rooms like `customer_<id>` or `seller_<id>`) to witness real-time order alerts and low-stock warnings live!

---

## 🧪 Automated Testing

Run the test suite covering the 7 mandatory grading expectations:
```bash
npm test
```

### Test Coverage Checklist:
1. `[Success]` Register a new customer with valid inputs (`201 Created`).
2. `[Validation Failure]` Missing required registration fields (`400 Bad Request`).
3. `[Resource Not Found]` Query non-existent product ID (`404 Not Found`).
4. `[Unauthorized]` Access protected resource without JWT (`401 Unauthorized`).
5. `[Forbidden / RBAC]` Customer attempting admin category creation (`403 Forbidden`).
6. `[Duplicate / Conflict]` Registration with already registered email (`409 Conflict`).
7. `[Business Rules & Concurrency]`:
   - Seller B prevented from modifying Seller A's product listings (`403 Forbidden`).
   - Stock guard prevents adding more quantity than available in inventory (`400 Bad Request`).
   - Atomic checkout decrements product stock without overselling (`201 Created`).
   - Order cancellation restores deducted stock back into inventory (`200 OK`).

---

## 📖 API Documentation Highlights

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register customer or seller
- `POST /api/auth/login` - Authenticate & obtain access/refresh tokens
- `POST /api/auth/refresh` - Rotate access token
- `POST /api/auth/logout` - Invalidate session

### Products & Inventory (`/api/products`)
- `GET /api/products` - Filter, search (`?q=`), sort (`?sort=price_asc`), and paginate
- `GET /api/products/:id` - Product details
- `POST /api/products` - Create product (Seller/Admin)
- `PATCH /api/products/:id` - Update listing / stock (Owner Seller / Admin)
- `DELETE /api/products/:id` - Delete product listing (Owner Seller / Admin)
- `GET /api/products/seller/me` - View own inventory & stock status (Seller)

### Shopping Cart (`/api/cart`)
- `GET /api/cart` - View cart with server-recalculated live prices and stock alerts
- `POST /api/cart/items` - Add item / quantity to cart
- `PATCH /api/cart/items/:productId` - Update item quantity
- `DELETE /api/cart/items/:productId` - Remove item
- `DELETE /api/cart` - Empty cart

### Orders & Checkout (`/api/orders`)
- `POST /api/orders/checkout` - Atomic stock decrement, simulated payment, creates order
- `GET /api/orders/me` - Customer order history
- `GET /api/orders/:id` - Order details (scoped by RBAC)
- `PATCH /api/orders/:id/status` - State transitions (`confirmed -> processing -> shipped -> delivered`)
- `POST /api/orders/:id/cancel` - Cancel order & restore inventory stock

### Reports & Analytics (`/api/reports`)
- `GET /api/reports/sales-summary` - Revenue, total orders, average order value
- `GET /api/reports/top-products` - Best-selling product volume & revenue pipeline
- `GET /api/reports/inventory` - Inventory valuation, low-stock threshold alerts

---

## 📮 Postman Collection
Import `postman_collection.json` into Postman. It includes pre-configured collection variables (`baseUrl`, `adminToken`, `sellerToken`, `customerToken`) and tests that automatically capture tokens upon login.
