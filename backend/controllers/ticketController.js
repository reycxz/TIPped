const Ticket = require('../models/Ticket');

// @desc    Get dynamic KPI metrics
// @route   GET /api/tickets/metrics
// @access  Private
exports.getMetrics = async (req, res) => {
  try {
    const query = {};
    
    // Role-based metric scoping
    if (req.user && req.user.role === 'User') {
      query.submittedBy = req.user._id;
    } else if (req.user && req.user.role === 'Department' && req.user.departmentCategory) {
      query.category = req.user.departmentCategory;
    }

    const [pending, inProgress, resolved] = await Promise.all([
      Ticket.countDocuments({ ...query, status: 'Pending' }),
      Ticket.countDocuments({ ...query, status: 'In Progress' }),
      Ticket.countDocuments({ ...query, status: 'Resolved' }),
    ]);

    res.json({
      pending,
      inProgress,
      resolved,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get user tickets
// @route   GET /api/tickets/my-tickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ submittedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
