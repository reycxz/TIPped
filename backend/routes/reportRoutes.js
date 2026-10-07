const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, requireRole, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// =========================================================================
// Constraint 1: Static routes MUST be declared strictly BEFORE dynamic '/:id' routes
// router.get('/archived', ...) is placed before any parameterized routes
// =========================================================================

// 1. Archive / Bin endpoint (Strictly accessible to 'superadmin')
router.get('/archived', verifyToken, authorize('superadmin'), ticketController.getArchivedReports);

// 2. Specific collection/metric routes
router.get('/categories', ticketController.getCategories);
router.get('/metrics', verifyToken, ticketController.getMetrics);
router.get('/my-tickets', verifyToken, ticketController.getMyTickets);
router.get('/admin', verifyToken, requireRole('Department', 'Superadmin'), ticketController.getAdminTickets);
router.get('/analytics', verifyToken, authorize('superadmin'), ticketController.getAnalytics);

// 3. Public guest report submission
router.post('/guest', upload.array('images', 5), ticketController.createGuestTicket);

// 4. Base collection routes
router.get('/', verifyToken, requireRole('Department', 'Superadmin'), ticketController.getTickets);
router.post('/', verifyToken, upload.array('images', 5), ticketController.createTicket);

// 5. Specific sub-path actions on a document (BEFORE generic /:id)
router.patch('/:id/archive', verifyToken, authorize('superadmin'), ticketController.archiveReport);
router.put('/:id/archive', verifyToken, authorize('superadmin'), ticketController.archiveReport);
router.post('/:id/archive', verifyToken, authorize('superadmin'), ticketController.archiveReport);
router.patch('/:id/restore', verifyToken, authorize('superadmin'), ticketController.restoreReport);
router.put('/:id/restore', verifyToken, authorize('superadmin'), ticketController.restoreReport);
router.post('/:id/restore', verifyToken, authorize('superadmin'), ticketController.restoreReport);

// 6. Generic dynamic ID routes (MUST be at the bottom)
router.put('/:id', verifyToken, requireRole('Department', 'Superadmin'), ticketController.updateTicket);
router.delete('/:id', verifyToken, authorize('superadmin'), ticketController.deleteReportForever);

module.exports = router;
