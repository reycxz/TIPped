const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid token: user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied: User not authenticated' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const allowedRoles = roles.map((r) => r.toLowerCase());

    if (!allowedRoles.includes(userRole) && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

// Constraint 2: Middleware explicitly allowing both 'superadmin' and 'department' roles
const requireStaffOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied: User not authenticated' });
  }

  const role = (req.user.role || '').toLowerCase();
  if (!['superadmin', 'department'].includes(req.user.role) && !['superadmin', 'department'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  next();
};

const authorize = requireRole;

module.exports = {
  verifyToken,
  requireRole,
  requireStaffOrAdmin,
  authMiddleware,
  authorize
};
