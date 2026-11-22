require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initializeSocket } = require('./sockets/socketManager');
const setupEventHandlers = require('./events/orderEvents');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO instance
initializeSocket(server);

// Setup internal EventEmitter listeners
setupEventHandlers();

// Connect to MongoDB and start HTTP Server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log('====================================================');
      console.log(`  E-Commerce & Inventory Backend Server is running!  `);
      console.log(`  Port: http://localhost:${PORT}                      `);
      console.log(`  Real-Time Socket Client: http://localhost:${PORT}  `);
      console.log(`  Health Check: http://localhost:${PORT}/api/health  `);
      console.log('====================================================');
    });
  })
  .catch((err) => {
    console.error(`Fatal: Failed to start server - ${err.message}`);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
