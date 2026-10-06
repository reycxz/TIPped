const Ticket = require('../models/Ticket');
const { generateTicketId } = require('../utils/ticketIdGenerator');
const { sendStatusUpdateEmail } = require('../utils/emailService');
const { streamUpload, uploadDirect } = require('../config/cloudinary');

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
    const { campus, building, floor, room, landmark, category, description } = req.body;

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

    // Constraint 1 & 2 (Cloudinary): Stream images directly to Cloudinary, never store base64 in MongoDB
    const imageUrls = [];

    // 1. Process files uploaded via Multer (streamed directly to Cloudinary)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        if (file.buffer) {
          const result = await streamUpload(file.buffer);
          if (result && result.secure_url) {
            imageUrls.push(result.secure_url);
          }
        }
      }
    }

    // 2. Process image strings if provided in req.body (e.g. from JSON payloads)
    let bodyImages = req.body.images;
    if (typeof bodyImages === 'string') {
      try {
        bodyImages = JSON.parse(bodyImages);
      } catch (e) {
        bodyImages = [bodyImages];
      }
    }

    if (Array.isArray(bodyImages) && bodyImages.length > 0) {
      for (const img of bodyImages) {
        if (typeof img === 'string') {
          if (img.startsWith('http://') || img.startsWith('https://')) {
            imageUrls.push(img);
          } else if (img.startsWith('data:image/') || img.length > 100) {
            // Upload to Cloudinary and store only secure_url - never save base64 to MongoDB
            const result = await uploadDirect(img);
            if (result && result.secure_url) {
              imageUrls.push(result.secure_url);
            }
          }
        }
      }
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
      images: imageUrls,
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

// @desc    Get admin tickets with RBAC scoping & filters
// @route   GET /api/tickets/admin
// @access  Private (Department & Superadmin only)
exports.getAdminTickets = async (req, res) => {
  try {
    const query = {};

    // Constraint 3 (RBAC): Department Staff only fetch tickets matching their department category
    if (req.user.role === 'Department') {
      if (!req.user.departmentCategory) {
        return res.json([]);
      }
      query.category = req.user.departmentCategory;
    }
    // Superadmin fetches all departments

    // Filter by campus
    if (req.query.campus && req.query.campus !== 'All') {
      query.campus = req.query.campus;
    }

    // Filter by status
    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    // Search by Ticket ID
    if (req.query.search && req.query.search.trim()) {
      query.ticketId = { $regex: req.query.search.trim(), $options: 'i' };
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update ticket status, priority, category, or add admin remarks
// @route   PUT /api/tickets/:id
// @access  Private (Department & Superadmin only)
exports.updateTicket = async (req, res) => {
  try {
    const { status, priority, category, adminNote } = req.body;

    const ticket = await Ticket.findById(req.params.id).populate('submittedBy');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // RBAC check for Department Staff
    if (req.user.role === 'Department' && ticket.category !== req.user.departmentCategory) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    // Constraint 1: If Admin changes status to 'Resolved', the Admin Note becomes required
    if (status === 'Resolved' && (!adminNote || !adminNote.trim())) {
      return res.status(400).json({ error: 'Admin note is required to resolve ticket' });
    }

    let statusChanged = false;
    const oldStatus = ticket.status;
    if (status && status !== oldStatus) {
      ticket.status = status;
      statusChanged = true;
      ticket.auditTrail.push({
        action: 'Status Update',
        details: `Status changed to ${status}`,
        performedBy: req.user._id,
      });
    }

    if (priority && priority !== ticket.priority) {
      ticket.priority = priority;
      ticket.auditTrail.push({
        action: 'Priority Update',
        details: `Priority changed to ${priority}`,
        performedBy: req.user._id,
      });
    }

    // Silent Department Transfers: appends silent log to auditTrail without emailing user
    if (category && category !== ticket.category) {
      ticket.category = category;
      ticket.auditTrail.push({
        action: 'Department Re-assignment',
        details: `Re-assigned to ${category}`,
        performedBy: req.user._id,
      });
    }

    let noteAdded = false;
    if (adminNote && adminNote.trim()) {
      noteAdded = true;
      ticket.adminRemarks.push({
        note: adminNote.trim(),
        updatedBy: req.user._id,
        timestamp: new Date(),
      });
      ticket.auditTrail.push({
        action: 'Admin Note',
        details: adminNote.trim(),
        performedBy: req.user._id,
      });
    }

    await ticket.save();

    // Constraint 3: Dispatch formal plain text email via Nodemailer if status changed or note submitted
    if ((statusChanged || noteAdded) && ticket.submittedBy?.email) {
      const formattedTimestamp = new Date().toLocaleString();
      await sendStatusUpdateEmail({
        to: ticket.submittedBy.email,
        ticketId: ticket.ticketId,
        timestamp: formattedTimestamp,
        campus: ticket.campus,
        room: ticket.locationInfo?.room || '',
        category: ticket.category,
        newStatus: ticket.status,
        adminNote: adminNote ? adminNote.trim() : '',
      });
    }

    res.json({
      message: 'Ticket updated',
      ticket,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



