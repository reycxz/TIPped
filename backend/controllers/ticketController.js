const Ticket = require('../models/Ticket');
const Department = require('../models/Department');
const Category = require('../models/Category');
const User = require('../models/User');
const { generateTicketId } = require('../utils/ticketIdGenerator');
const { sendStatusUpdateEmail } = require('../utils/emailService');
const { streamUpload, uploadDirect } = require('../config/cloudinary');

const DEFAULT_CATEGORIES = [
  'ITSO',
  'Maintenance',
  'SOHAS',
  'Canteen',
  'OSA',
  'Guidance',
];

// Helper to process images from multer files or body data
const extractImageUrls = async (req) => {
  const imageUrls = [];

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
          const result = await uploadDirect(img);
          if (result && result.secure_url) {
            imageUrls.push(result.secure_url);
          }
        }
      }
    }
  }

  return imageUrls;
};

// @desc    Get dynamic KPI metrics
// @route   GET /api/tickets/metrics
// @access  Private
exports.getMetrics = async (req, res) => {
  try {
    const query = {};
    
    // Role-based metric scoping
    if (req.user && req.user.role === 'User') {
      query.$or = [{ submittedBy: req.user._id }, { reportedBy: req.user._id }];
    } else if (req.user && (req.user.role === 'Department' || req.user.role === 'Department Staff')) {
      const dept = req.user.department || req.user.departmentCategory;
      if (dept) {
        query.$or = [{ assignedDepartment: dept }, { category: dept }];
      }
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

// @desc    Get user tickets with Smart Search and combined filters
// @route   GET /api/tickets/my-tickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const query = {
      $or: [{ submittedBy: req.user._id }, { reportedBy: req.user._id }]
    };

    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    if (req.query.category && req.query.category !== 'All') {
      query.$or = [
        { assignedDepartment: req.query.category },
        { issueCategory: req.query.category },
        { category: req.query.category }
      ];
    }

    if (req.query.search && req.query.search.trim()) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { ticketId: regex },
            { 'locationInfo.room': regex },
            { 'locationInfo.building': regex },
            { 'locationInfo.landmark': regex },
            { campus: regex },
            { issueCategory: regex },
            { assignedDepartment: regex },
            { category: regex },
            { description: regex },
          ]
        }
      ];
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create a new ticket report (Authenticated)
// @route   POST /api/tickets
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { campus, building, floor, room, landmark, issueCategory, category, description } = req.body;
    const selectedCategory = (issueCategory || category || '').trim();

    if (!campus || !building || floor === undefined || !room || !selectedCategory || !description) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (campus === 'Arlegui' && building !== 'Arlegui (A)') {
      return res.status(400).json({ error: 'Invalid building' });
    }
    const casalBuildings = ["Founder's (F)", "Building 2 (C)", "PC 5", "PC 12", "PE Center"];
    if (campus === 'Casal' && !casalBuildings.includes(building)) {
      return res.status(400).json({ error: 'Invalid building' });
    }

    const firstDigitMatch = String(room).match(/\d/);
    if (!firstDigitMatch || firstDigitMatch[0] !== String(floor)) {
      return res.status(400).json({ error: 'Floor mismatch' });
    }

    // Dynamic department and prefix resolution from database
    let assignedDepartment = 'General';
    let prefix = 'GEN';

    const categoryDoc = await Category.findOne({ issueName: req.body.issueCategory || selectedCategory });
    if (categoryDoc) {
      assignedDepartment = categoryDoc.departmentName;
      const departmentDoc = await Department.findOne({ name: assignedDepartment });
      if (departmentDoc && departmentDoc.prefix) {
        prefix = departmentDoc.prefix;
      }
    } else {
      // Direct Department fallback
      const departmentDoc = await Department.findOne({ name: req.body.issueCategory || selectedCategory });
      if (departmentDoc) {
        assignedDepartment = departmentDoc.name;
        prefix = departmentDoc.prefix;
      }
    }

    const imageUrls = await extractImageUrls(req);

    let ticketId;
    let isUnique = false;
    while (!isUnique) {
      ticketId = generateTicketId(campus, prefix);
      const existing = await Ticket.findOne({ ticketId });
      if (!existing) {
        isUnique = true;
      }
    }

    const ticket = new Ticket({
      ticketId,
      campus,
      locationInfo: {
        building,
        floor: Number(floor),
        room: room.trim(),
        landmark: landmark ? landmark.trim() : ''
      },
      issueCategory: selectedCategory,
      assignedDepartment,
      description: description.trim(),
      images: imageUrls,
      status: 'Pending',
      adminRemarks: [],
      submittedBy: req.user ? req.user._id : null,
      reportedBy: req.user ? req.user._id : null,
      auditTrail: [
        {
          action: 'Created',
          details: 'Report created',
          performedBy: req.user ? req.user._id : null,
          timestamp: new Date()
        }
      ]
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

// @desc    Create a new guest ticket report (Unauthenticated)
// @route   POST /api/tickets/guest
// @access  Public
exports.createGuestTicket = async (req, res) => {
  try {
    const { campus, building, floor, room, landmark, issueCategory, category, description, guestEmail } = req.body;
    const selectedCategory = (issueCategory || category || '').trim();

    if (!campus || !building || floor === undefined || !room || !selectedCategory || !description) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (campus === 'Arlegui' && building !== 'Arlegui (A)') {
      return res.status(400).json({ error: 'Invalid building' });
    }
    const casalBuildings = ["Founder's (F)", "Building 2 (C)", "PC 5", "PC 12", "PE Center"];
    if (campus === 'Casal' && !casalBuildings.includes(building)) {
      return res.status(400).json({ error: 'Invalid building' });
    }

    const firstDigitMatch = String(room).match(/\d/);
    if (!firstDigitMatch || firstDigitMatch[0] !== String(floor)) {
      return res.status(400).json({ error: 'Floor mismatch' });
    }

    // Dynamic department and prefix resolution from database
    let assignedDepartment = 'General';
    let prefix = 'GEN';

    const categoryDoc = await Category.findOne({ issueName: req.body.issueCategory || selectedCategory });
    if (categoryDoc) {
      assignedDepartment = categoryDoc.departmentName;
      const departmentDoc = await Department.findOne({ name: assignedDepartment });
      if (departmentDoc && departmentDoc.prefix) {
        prefix = departmentDoc.prefix;
      }
    } else {
      // Direct Department fallback
      const departmentDoc = await Department.findOne({ name: req.body.issueCategory || selectedCategory });
      if (departmentDoc) {
        assignedDepartment = departmentDoc.name;
        prefix = departmentDoc.prefix;
      }
    }

    const imageUrls = await extractImageUrls(req);

    let ticketId;
    let isUnique = false;
    while (!isUnique) {
      ticketId = generateTicketId(campus, prefix);
      const existing = await Ticket.findOne({ ticketId });
      if (!existing) {
        isUnique = true;
      }
    }

    const ticket = new Ticket({
      ticketId,
      campus,
      locationInfo: {
        building,
        floor: Number(floor),
        room: room.trim(),
        landmark: landmark ? landmark.trim() : ''
      },
      issueCategory: selectedCategory,
      assignedDepartment,
      description: description.trim(),
      images: imageUrls,
      status: 'Pending',
      adminRemarks: [],
      submittedBy: null,
      reportedBy: null,
      guestEmail: guestEmail ? guestEmail.trim().toLowerCase() : null,
      auditTrail: [
        {
          action: 'Created',
          details: 'Guest report submitted',
          timestamp: new Date()
        }
      ]
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
// @route   GET /api/tickets & GET /api/tickets/admin
// @access  Private (Department & Superadmin only)
exports.getTickets = async (req, res) => {
  try {
    const query = {};

    if (req.user && (req.user.role === 'Department' || req.user.role === 'Department Staff')) {
      query.assignedDepartment = req.user.department || req.user.departmentCategory;
    }

    if (req.query.campus && req.query.campus !== 'All') {
      query.campus = req.query.campus;
    }

    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    if (req.query.category && req.query.category !== 'All') {
      query.$or = [
        { assignedDepartment: req.query.category },
        { issueCategory: req.query.category }
      ];
    }

    if (req.query.search && req.query.search.trim()) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { ticketId: regex },
        { 'locationInfo.room': regex },
        { 'locationInfo.building': regex },
        { 'locationInfo.landmark': regex },
        { campus: regex },
        { issueCategory: regex },
        { assignedDepartment: regex },
        { description: regex },
      ];
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminTickets = exports.getTickets;

// @desc    Update ticket status, priority, category, or add admin remarks
// @route   PUT /api/tickets/:id
// @access  Private (Department & Superadmin only)
exports.updateTicket = async (req, res) => {
  try {
    const { status, priority, category, adminNote } = req.body;

    const ticket = await Ticket.findById(req.params.id).populate('submittedBy').populate('reportedBy');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (req.user.role === 'Department' && (ticket.assignedDepartment || ticket.category) !== (req.user.department || req.user.departmentCategory)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

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

    const deptToUpdate = req.body.assignedDepartment || category;
    if (deptToUpdate && deptToUpdate !== (ticket.assignedDepartment || ticket.category)) {
      ticket.assignedDepartment = deptToUpdate;
      ticket.auditTrail.push({
        action: 'Department Re-assignment',
        details: `Re-assigned to ${deptToUpdate}`,
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

    // Formal text-only notification sent ONLY if status changed or admin note submitted
    const recipientEmail = ticket.submittedBy?.email || ticket.reportedBy?.email || ticket.guestEmail;
    if ((statusChanged || noteAdded) && recipientEmail) {
      const formattedTimestamp = new Date(ticket.createdAt).toLocaleString();
      await sendStatusUpdateEmail({
        to: recipientEmail,
        ticketId: ticket.ticketId,
        timestamp: formattedTimestamp,
        campus: ticket.campus,
        room: ticket.locationInfo?.room || '',
        category: ticket.issueCategory || ticket.assignedDepartment || ticket.category || 'General',
        newStatus: ticket.status,
        adminNote: adminNote ? adminNote.trim() : 'None',
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

// @desc    Get active categories
// @route   GET /api/tickets/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().select('issueName');
    if (categories && categories.length > 0) {
      return res.json(categories.map(c => c.issueName));
    }
    res.json(DEFAULT_CATEGORIES);
  } catch (error) {
    res.json(DEFAULT_CATEGORIES);
  }
};

// @desc    Get Superadmin analytics based on real backend data
// @route   GET /api/tickets/analytics
// @access  Private (Superadmin only)
exports.getAnalytics = async (req, res) => {
  try {
    const [
      totalTickets,
      pendingCount,
      inProgressCount,
      resolvedCount,
      arleguiCount,
      casalCount,
      totalUsers,
      totalDeptStaff,
      allTickets
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'Pending' }),
      Ticket.countDocuments({ status: 'In Progress' }),
      Ticket.countDocuments({ status: 'Resolved' }),
      Ticket.countDocuments({ campus: 'Arlegui' }),
      Ticket.countDocuments({ campus: 'Casal' }),
      User.countDocuments({ role: 'User' }),
      User.countDocuments({ role: 'Department' }),
      Ticket.find().select('category issueCategory assignedDepartment status campus createdAt').sort({ createdAt: -1 })
    ]);

    // Calculate category breakdown dynamically
    const categoryCounts = {};
    allTickets.forEach(t => {
      const cat = t.assignedDepartment || t.issueCategory || t.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    res.json({
      totalTickets,
      pendingCount,
      inProgressCount,
      resolvedCount,
      arleguiCount,
      casalCount,
      totalUsers,
      totalDeptStaff,
      categoryCounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




