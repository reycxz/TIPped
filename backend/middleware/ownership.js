const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');

const getTicketScope = (user) => {
  const role = (user?.role || '').toLowerCase();

  if (role === 'user') {
    return {
      $or: [
        { submittedBy: user._id },
        { reportedBy: user._id }
      ]
    };
  }

  if (role === 'department' || role === 'department staff') {
    const categories = Array.isArray(user.assignedCategories) && user.assignedCategories.length > 0
      ? user.assignedCategories
      : (user.departmentCategory ? [user.departmentCategory] : []);

    return {
      $or: [
        { issueCategory: { $in: categories } },
        { category: { $in: categories } }
      ]
    };
  }

  if (role === 'admin' || role === 'superadmin') {
    return {};
  }

  return { _id: null };
};

const applyTicketScope = (query, user) => {
  const scope = getTicketScope(user);
  if (Object.keys(scope).length > 0) {
    query.$and = [...(query.$and || []), scope];
  }
  return query;
};

const validateObjectId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  next();
};

const requireScopedTicket = async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ticket ID format' });
  }

  try {
    const filter = applyTicketScope({ _id: req.params.id }, req.user);
    const ticket = await Ticket.findOne(filter);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    req.ticket = ticket;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  applyTicketScope,
  requireScopedTicket,
  validateObjectId
};
