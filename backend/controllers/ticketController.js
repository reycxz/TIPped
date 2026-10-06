const Ticket = require('../models/Ticket');
const { generateTicketId } = require('../utils/ticketIdGenerator');

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

// @desc    Create a new ticket report
// @route   POST /api/tickets
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { campus, building, floor, room, landmark, category, description, images } = req.body;

    if (!campus || !building || floor === undefined || !room || !category || !description) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Constraint 1: Building validation based on campus
    if (campus === 'Arlegui' && building !== 'Arlegui (A)') {
      return res.status(400).json({ error: 'Invalid building' });
    }
    const casalBuildings = ["Founder's (F)", "Building 2 (C)", "PC 5", "PC 12", "PE Center"];
    if (campus === 'Casal' && !casalBuildings.includes(building)) {
      return res.status(400).json({ error: 'Invalid building' });
    }

    // Constraint 2: Room first digit validation against floor
    const firstDigitMatch = String(room).match(/\d/);
    if (!firstDigitMatch || firstDigitMatch[0] !== String(floor)) {
      return res.status(400).json({ error: 'Floor mismatch' });
    }

    // Constraint 3: Generate hash-based Ticket ID [CAMPUS]-[DEPT][MMDD][5-CHAR-HASH]
    let ticketId;
    let isUnique = false;
    while (!isUnique) {
      ticketId = generateTicketId(campus, category);
      const existing = await Ticket.findOne({ ticketId });
      if (!existing) {
        isUnique = true;
      }
    }

    // Default status strictly 'Pending', adminRemarks strictly []
    const ticket = new Ticket({
      ticketId,
      campus,
      locationInfo: {
        building,
        floor: Number(floor),
        room: room.trim(),
        landmark: landmark ? landmark.trim() : ''
      },
      category: category.trim(),
      description: description.trim(),
      images: Array.isArray(images) ? images : [],
      status: 'Pending',
      adminRemarks: [],
      submittedBy: req.user ? req.user._id : null
    });

    await ticket.save();

    res.status(201).json({
      message: 'Report submitted',
      ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

