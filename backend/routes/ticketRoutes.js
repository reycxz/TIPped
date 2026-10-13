const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, requireRole, requireStaffOrAdmin } = require('../middleware/auth');
const { requireScopedTicket } = require('../middleware/ownership');

const upload = require('../middleware/upload');
const { guestTicketLimiter, ticketCreateLimiter } = require('../middleware/rateLimiters');

// 1. Public static routes
router.get('/categories', ticketController.getCategories);
router.post('/guest', guestTicketLimiter, upload.array('images', 5), ticketController.createGuestTicket);

// 2. Protected static collection & metric routes (MUST precede dynamic '/:id' routes)
router.get('/metrics', verifyToken, ticketController.getMetrics);
router.get('/my-tickets', verifyToken, ticketController.getMyTickets);
router.get('/archived', verifyToken, requireStaffOrAdmin, ticketController.getArchivedReports);
router.get('/analytics', verifyToken, requireRole('superadmin', 'department'), ticketController.getAnalytics);
router.get('/admin', verifyToken, requireRole('Admin', 'Department', 'Superadmin'), ticketController.getAdminTickets);

// 3. Base collection routes
router.get('/', verifyToken, requireRole('Admin', 'Department', 'Superadmin'), ticketController.getTickets);
router.post('/', verifyToken, ticketCreateLimiter, upload.array('images', 5), ticketController.createTicket);

// 4. Specific sub-path actions on a document (BEFORE generic /:id)
router.put('/:id/archive', verifyToken, requireStaffOrAdmin, requireScopedTicket, ticketController.archiveReport);
router.post('/:id/archive', verifyToken, requireStaffOrAdmin, requireScopedTicket, ticketController.archiveReport);
router.put('/:id/restore', verifyToken, requireStaffOrAdmin, requireScopedTicket, ticketController.restoreReport);
router.post('/:id/restore', verifyToken, requireStaffOrAdmin, requireScopedTicket, ticketController.restoreReport);

// 5. Generic dynamic ID routes (MUST be at the bottom)
router.put('/:id', verifyToken, requireRole('Admin', 'Department', 'Superadmin'), requireScopedTicket, ticketController.updateTicket);
router.delete('/:id', verifyToken, requireStaffOrAdmin, requireScopedTicket, ticketController.deleteReportForever);

module.exports = router;
