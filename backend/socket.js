const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initializeSocket = (httpServer) => {
  const origins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: origins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose === 'privacy-consent' || !decoded.id) {
        return next(new Error('Invalid access token'));
      }

      const user = await User.findById(decoded.id).select(
        '_id role hasAcceptedPrivacyPolicy assignedCategories departmentCategory'
      );
      if (!user) {
        return next(new Error('User not found'));
      }

      const role = (user.role || '').toLowerCase();
      if (!['admin', 'superadmin', 'department'].includes(role) && !user.hasAcceptedPrivacyPolicy) {
        return next(new Error('Privacy consent is required'));
      }

      socket.data.userId = user._id.toString();
      socket.data.role = role;
      socket.data.assignedCategories = Array.isArray(user.assignedCategories)
        ? user.assignedCategories
        : [];
      if (user.departmentCategory && !socket.data.assignedCategories.includes(user.departmentCategory)) {
        socket.data.assignedCategories.push(user.departmentCategory);
      }
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.data.userId);
    socket.on('join_user_room', (userId) => {
      if (String(userId) !== socket.data.userId) {
        console.warn(`[Socket.IO] Rejected room join for authenticated user ${socket.data.userId}`);
        return;
      }

      socket.join(socket.data.userId);
    });

    if (['admin', 'superadmin'].includes(socket.data.role)) {
      socket.join('admins');
    } else if (socket.data.role === 'department') {
      socket.data.assignedCategories.forEach((category) => {
        socket.join(`department:${category}`);
      });
    }
  });

  return io;
};

const emitToAdmins = (event, payload) => {
  if (!io) throw new Error('Socket.IO has not been initialized');
  io.to('admins').emit(event, payload);
};

const emitNewTicket = (ticket) => {
  if (!io) throw new Error('Socket.IO has not been initialized');
  io.to('admins').emit('newTicket', ticket);

  const ticketCategory = ticket.issueCategory || ticket.assignedDepartment;
  if (ticketCategory) {
    io.to(`department:${ticketCategory}`).emit('newTicket', ticket);
  }
};

const emitToUser = (userId, event, payload) => {
  if (!io) throw new Error('Socket.IO has not been initialized');
  io.to(String(userId)).emit(event, payload);
};

module.exports = { initializeSocket, emitToAdmins, emitNewTicket, emitToUser };
