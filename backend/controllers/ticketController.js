const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Report = require('../models/Report');
const Department = require('../models/Department');
const Category = require('../models/Category');
const User = require('../models/User');
const { generateTicketId } = require('../utils/ticketIdGenerator');
const { sendStatusUpdateEmail, sendGuestConfirmationEmail } = require('../utils/emailService');
const { streamUpload, uploadDirect } = require('../config/cloudinary');
const { emitNewTicket, emitToUser } = require('../socket');

// Helper to escape special regular expression characters preventing ReDoS and query crashes
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const DEFAULT_CATEGORIES = [
  'ITSO',
  'Maintenance',
  'SOHAS',
  'Canteen',
  'OSA',
  'Guidance',
];

const CASAL_BUILDINGS = [
  "Founder's (F)",
  'Building 2 (C)',
  'PC 5',
  'PC 12',
  'PE Center',
  'PE Center Annex',
  'Student Hub',
  'Study Area / Canteen',
  'Congregating Area',
  'Casal Garden'
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
    const role = (req.user?.role || '').toLowerCase();
    const query = {
      isArchived: { $ne: true }
    };
    
    // Role-based metric scoping (case-insensitive role matching)
    if (role === 'user') {
      query.$or = [{ submittedBy: req.user._id }, { reportedBy: req.user._id }];
    } else if (role === 'department' || role === 'department staff') {
      const assigned = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      req.user.assignedCategories = assigned;
      query.issueCategory = { $in: req.user.assignedCategories };
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
    const userId = req.user._id;
    // Strict Object-Level Authorization: Scoped strictly to the requesting user
    const query = {
      $and: [
        { $or: [{ submittedBy: userId }, { reportedBy: userId }] },
        { isArchived: { $ne: true } }
      ]
    };

    if (req.query.status && req.query.status !== 'All') {
      query.$and.push({ status: req.query.status });
    }

    if (req.query.category && req.query.category !== 'All') {
      query.$and.push({
        $or: [
          { assignedDepartment: req.query.category },
          { issueCategory: req.query.category },
          { category: req.query.category }
        ]
      });
    }

    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      query.$and.push({
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
      });
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
    if (campus === 'Casal' && !CASAL_BUILDINGS.includes(building)) {
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
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('submittedBy', 'firstName lastName email role')
      .populate('reportedBy', 'firstName lastName email role')
      .lean();
    emitNewTicket(populatedTicket);

    res.status(201).json({
      message: 'Report submitted',
      ticket: populatedTicket
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
    if (campus === 'Casal' && !CASAL_BUILDINGS.includes(building)) {
      return res.status(400).json({ error: 'Invalid building' });
    }

    const firstDigitMatch = String(room).match(/\d/);
    if (!firstDigitMatch || firstDigitMatch[0] !== String(floor)) {
      return res.status(400).json({ error: 'Floor mismatch' });
    }

    // Input sanitization and bounds checking
    if (guestEmail && guestEmail.trim()) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(guestEmail.trim())) {
        return res.status(400).json({ error: 'Invalid guest email address format' });
      }
    }

    if (description && description.length > 5000) {
      return res.status(400).json({ error: 'Description exceeds maximum allowed length of 5000 characters' });
    }

    if (landmark && landmark.length > 200) {
      return res.status(400).json({ error: 'Landmark exceeds maximum allowed length of 200 characters' });
    }

    if (room && room.length > 50) {
      return res.status(400).json({ error: 'Room identifier exceeds maximum allowed length of 50 characters' });
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
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('submittedBy', 'firstName lastName email role')
      .populate('reportedBy', 'firstName lastName email role')
      .lean();
    emitNewTicket(populatedTicket);

    // Constraint 3 & 5: Fire confirmation email non-blocking — does NOT delay the 201 response
    if (guestEmail) {
      sendGuestConfirmationEmail({
        to: guestEmail.trim().toLowerCase(),
        category: selectedCategory,
        campus,
        building,
      }).catch((err) =>
        console.error('[Nodemailer Error] Guest confirmation (unhandled):', err.message)
      );
    }

    res.status(201).json({
      message: 'Report submitted',
      ticket: populatedTicket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get admin tickets / reports with RBAC scoping & filters (excluding archived)
// @route   GET /api/tickets, GET /api/tickets/admin, GET /api/reports
// @access  Private (Department & Superadmin only)
exports.getTickets = async (req, res) => {
  try {
    const query = {
      isArchived: { $ne: true }
    };

    const role = (req.user?.role || '').toLowerCase();
    if (role === 'department' || role === 'department staff') {
      const assigned = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      req.user.assignedCategories = assigned;
      query.issueCategory = { $in: req.user.assignedCategories };
    }

    if (req.query.campus && req.query.campus !== 'All') {
      query.campus = req.query.campus;
    }

    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    const andConditions = [];

    if (req.query.category && req.query.category !== 'All') {
      andConditions.push({
        $or: [
          { assignedDepartment: req.query.category },
          { issueCategory: req.query.category }
        ]
      });
    }

    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      andConditions.push({
        $or: [
          { ticketId: regex },
          { 'locationInfo.room': regex },
          { 'locationInfo.building': regex },
          { 'locationInfo.landmark': regex },
          { campus: regex },
          { issueCategory: regex },
          { assignedDepartment: regex },
          { description: regex },
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
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

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }

    const ticket = await Ticket.findById(req.params.id).populate('submittedBy').populate('reportedBy');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const role = (req.user?.role || '').toLowerCase();
    if (role === 'department') {
      const userCats = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      const ticketCategory = ticket.issueCategory || ticket.assignedDepartment || ticket.category;
      if (!userCats.includes(ticketCategory) && !userCats.includes(ticket.assignedDepartment) && !userCats.includes(ticket.issueCategory)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
    }

    if (status === 'Resolved' && (!adminNote || !adminNote.trim())) {
      return res.status(400).json({ error: 'Admin note is required to resolve ticket' });
    }

    // Dynamic Actor Identification (case-normalized)
    let actorPrefix = 'User';
    if (role === 'admin') {
      actorPrefix = 'Admin';
    } else if (role === 'superadmin') {
      actorPrefix = 'Superadmin';
    } else if (role === 'department') {
      actorPrefix = req.user.firstName || 'Department';
    } else if (role === 'user') {
      actorPrefix = 'User';
    }

    let statusChanged = false;
    const oldStatus = ticket.status;
    if (status && status !== oldStatus) {
      ticket.status = status;
      statusChanged = true;
      ticket.auditTrail.push({
        action: `${actorPrefix} Status Update`,
        details: `Status changed to ${status}`,
        performedBy: req.user._id,
      });
    }

    if (priority && priority !== ticket.priority) {
      ticket.priority = priority;
      ticket.auditTrail.push({
        action: `${actorPrefix} Priority Update`,
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
        action: `${actorPrefix} Note`,
        details: adminNote.trim(),
        performedBy: req.user._id,
      });
    }

    await ticket.save();

    if (statusChanged) {
      const updatedTicket = await Ticket.findById(ticket._id)
        .populate('reportedBy', '_id role')
        .populate('submittedBy', '_id role')
        .lean();
      const reporter = updatedTicket?.reportedBy || updatedTicket?.submittedBy;
      const reporterId = reporter?._id;

      if (reporterId && (reporter.role || '').toLowerCase() === 'user') {
        const reporterRoom = reporterId.toString();
        console.info(`[Socket.IO] Emitting ticketUpdated for ${updatedTicket.ticketId} to room ${reporterRoom}`);
        emitToUser(reporterRoom, 'ticketUpdated', updatedTicket);
      }
    }

    // Formal text-only notification dispatched asynchronously without blocking HTTP response
    const recipientEmail = ticket.submittedBy?.email || ticket.reportedBy?.email || ticket.guestEmail;
    if ((statusChanged || noteAdded) && recipientEmail) {
      const formattedTimestamp = new Date(ticket.createdAt).toLocaleString();
      sendStatusUpdateEmail({
        to: recipientEmail,
        ticketId: ticket.ticketId,
        timestamp: formattedTimestamp,
        campus: ticket.campus,
        room: ticket.locationInfo?.room || '',
        category: ticket.issueCategory || ticket.assignedDepartment || ticket.category || 'General',
        newStatus: ticket.status,
        adminNote: adminNote ? adminNote.trim() : 'None',
      }).catch((mailErr) => {
        console.error('[Nodemailer Error] Status update email failed:', mailErr.message);
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

// @desc    Get dynamic analytics metrics using Mongoose aggregation
// @route   GET /api/reports/analytics, GET /api/tickets/analytics
// @access  Private ('superadmin' and 'department' only)
exports.getAnalytics = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    if (!['superadmin', 'department'].includes(role) && !['superadmin', 'department'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const match = {
      isArchived: { $ne: true }
    };

    // Filter by campus (handles exact matches and variants like "Arlegui" or "Arlegui Campus")
    if (req.query.campus && req.query.campus !== 'All') {
      const cleanCampus = req.query.campus.trim().replace(/\s+Campus$/i, '');
      match.campus = { $regex: new RegExp(`^${cleanCampus}`, 'i') };
    }

    // Filter by timeframe
    if (req.query.timeframe && req.query.timeframe !== 'All Time' && req.query.timeframe !== 'all') {
      const now = new Date();
      if (req.query.timeframe === 'Last 7 Days' || req.query.timeframe === '7d') {
        match.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (req.query.timeframe === 'Last 30 Days' || req.query.timeframe === '30d') {
        match.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    // Role scoping for Department accounts
    if (role === 'department') {
      const assigned = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      if (assigned.length > 0) {
        match.$or = [
          { issueCategory: { $in: assigned } },
          { category: { $in: assigned } },
          { assignedDepartment: { $in: assigned } }
        ];
      }
    }

    // Constraint 1: Fetch real account counts directly from User collection
    const [deptCountLower, deptCountUpper, userCountLower, userCountUpper] = await Promise.all([
      User.countDocuments({ role: 'department' }),
      User.countDocuments({ role: 'Department' }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'User' })
    ]);
    const departmentAccounts = deptCountLower + deptCountUpper;
    const userAccounts = userCountLower + userCountUpper;

    // Constraint 2: Mongoose aggregate pipeline strictly grouping by category and excluding archived
    const results = await Report.aggregate([
      { $match: match },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          categoriesBreakdown: [
            {
              $group: {
                _id: { $ifNull: ['$category', '$issueCategory'] },
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          accountDirectory: [
            {
              $lookup: {
                from: 'users',
                localField: 'submittedBy',
                foreignField: '_id',
                as: 'submitter'
              }
            },
            {
              $project: {
                reporterRole: {
                  $cond: {
                    if: { $gt: [{ $size: '$submitter' }, 0] },
                    then: { $arrayElemAt: ['$submitter.role', 0] },
                    else: 'Guest'
                  }
                }
              }
            },
            {
              $group: {
                _id: '$reporterRole',
                count: { $sum: 1 }
              }
            }
          ],
          totalCount: [
            { $count: 'total' }
          ]
        }
      }
    ]);

    const facet = results[0] || {};
    const total = facet.totalCount && facet.totalCount[0] ? facet.totalCount[0].total : 0;

    let pending = 0;
    let inProgress = 0;
    let resolved = 0;

    (facet.statusCounts || []).forEach((item) => {
      const s = (item._id || '').toLowerCase();
      if (s === 'pending') pending = item.count;
      else if (s === 'in progress' || s === 'inprogress') inProgress = item.count;
      else if (s === 'resolved') resolved = item.count;
    });

    const categories = (facet.categoriesBreakdown || [])
      .filter((item) => item._id)
      .map((item) => ({
        name: item._id,
        count: item.count
      }));

    const categoryCounts = {};
    categories.forEach((item) => {
      categoryCounts[item.name] = item.count;
    });

    let guestCount = 0;
    (facet.accountDirectory || []).forEach((item) => {
      const r = (item._id || '').toLowerCase();
      if (r !== 'user' && r !== 'department' && r !== 'department staff' && r !== 'superadmin') {
        guestCount += item.count;
      }
    });

    const result = {
      total,
      totalTickets: total,
      pending,
      pendingCount: pending,
      inProgress,
      inProgressCount: inProgress,
      resolved,
      resolvedCount: resolved,
      userAccounts,
      departmentAccounts,
      guestAccounts: guestCount,
      categories,
      categoryCounts,
      accountDirectory: {
        user: userAccounts,
        userAccounts,
        department: departmentAccounts,
        departmentAccounts,
        guest: guestCount,
        guestAccounts: guestCount
      }
    };

    console.log('Analytics DB Result:', result);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// ARCHIVE / BIN CONTROLLERS (Constraint 2)
// Accessible strictly to 'superadmin' and 'department'
// ==========================================

// @desc    Soft-delete / Archive a report (move to bin)
// @route   PUT /api/reports/:id/archive or PUT /api/tickets/:id/archive
// @access  Private ('superadmin' & 'department' only)
exports.archiveReport = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    if (!['superadmin', 'department'].includes(req.user?.role) && !['superadmin', 'department'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Role-based department scoping
    if (role === 'department') {
      const userCats = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      const ticketCategory = ticket.issueCategory || ticket.assignedDepartment || ticket.category;
      if (userCats.length > 0 && !userCats.includes(ticketCategory) && !userCats.includes(ticket.assignedDepartment) && !userCats.includes(ticket.issueCategory)) {
        return res.status(403).json({ error: 'Forbidden: Cannot archive reports outside your assigned department' });
      }
    }

    ticket.isArchived = true;
    ticket.archivedAt = new Date();
    if (!Array.isArray(ticket.auditTrail)) {
      ticket.auditTrail = [];
    }
    ticket.auditTrail.push({
      action: 'Archived',
      details: 'Moved to Bin (30-day auto-deletion lifecycle)',
      performedBy: req.user._id,
      timestamp: new Date()
    });

    await ticket.save();

    res.json({
      message: 'Report moved to bin successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Restore a report from bin
// @route   PUT /api/reports/:id/restore or PUT /api/tickets/:id/restore
// @access  Private ('superadmin' & 'department' only)
exports.restoreReport = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    if (!['superadmin', 'department'].includes(req.user?.role) && !['superadmin', 'department'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (role === 'department') {
      const userCats = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      const ticketCategory = ticket.issueCategory || ticket.assignedDepartment || ticket.category;
      if (userCats.length > 0 && !userCats.includes(ticketCategory) && !userCats.includes(ticket.assignedDepartment) && !userCats.includes(ticket.issueCategory)) {
        return res.status(403).json({ error: 'Forbidden: Cannot restore reports outside your assigned department' });
      }
    }

    ticket.isArchived = false;
    ticket.archivedAt = null;
    if (!Array.isArray(ticket.auditTrail)) {
      ticket.auditTrail = [];
    }
    ticket.auditTrail.push({
      action: 'Restored',
      details: 'Restored from Bin',
      performedBy: req.user._id,
      timestamp: new Date()
    });

    await ticket.save();

    res.json({
      message: 'Report restored successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all archived reports in the bin
// @route   GET /api/reports/archived or GET /api/tickets/archived
// @access  Private ('superadmin' & 'department' only)
exports.getArchivedReports = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    if (!['superadmin', 'department'].includes(req.user?.role) && !['superadmin', 'department'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const query = {
      isArchived: true
    };

    // Scoping for department role
    if (role === 'department') {
      const assigned = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      if (assigned.length > 0) {
        query.issueCategory = { $in: assigned };
      }
    }

    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
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

    const reports = await Ticket.find(query).sort({ archivedAt: -1, updatedAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Permanently delete a report from bin
// @route   DELETE /api/reports/:id or DELETE /api/tickets/:id
// @access  Private ('superadmin' & 'department' only)
exports.deleteReportForever = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    if (!['superadmin', 'department'].includes(req.user?.role) && !['superadmin', 'department'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (role === 'department') {
      const userCats = Array.isArray(req.user.assignedCategories) && req.user.assignedCategories.length > 0
        ? req.user.assignedCategories
        : (req.user.departmentCategory ? [req.user.departmentCategory] : []);
      const ticketCategory = ticket.issueCategory || ticket.assignedDepartment || ticket.category;
      if (userCats.length > 0 && !userCats.includes(ticketCategory) && !userCats.includes(ticket.assignedDepartment) && !userCats.includes(ticket.issueCategory)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
    }

    await Ticket.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Report permanently deleted',
      deletedId: req.params.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Aliases for compatibility
exports.getReports = exports.getTickets;
exports.archiveTicket = exports.archiveReport;
exports.restoreTicket = exports.restoreReport;
exports.getArchivedTickets = exports.getArchivedReports;
exports.deleteReport = exports.deleteReportForever;
exports.deleteTicketForever = exports.deleteReportForever;
