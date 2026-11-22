const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let ioInstance = null;

const initializeSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket authentication and connection handling
  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Allow unauthenticated connection for testing if needed, or enforce token
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // If authenticated, join role/user specific rooms
    if (socket.user) {
      const { id, role } = socket.user;
      if (role === 'customer') {
        socket.join(`customer_${id}`);
        console.log(`[Socket.IO] Joined room: customer_${id}`);
      } else if (role === 'seller') {
        socket.join(`seller_${id}`);
        console.log(`[Socket.IO] Joined room: seller_${id}`);
      } else if (role === 'admin') {
        socket.join('admin_room');
        console.log(`[Socket.IO] Joined room: admin_room`);
      }
    }

    // Client can also explicitly join custom rooms if permitted
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined custom room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

const getIO = () => {
  return ioInstance;
};

module.exports = {
  initializeSocket,
  getIO
};
