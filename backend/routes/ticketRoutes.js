const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, requireRole } = require('../middleware/auth');

const upload = require('../middleware/upload');

// Public routes
router.get('/categories', ticketController.getCategories);
router.post('/guest', upload.array('images', 5), ticketController.createGuestTicket);

// Protected routes
router.get('/metrics', verifyToken, ticketController.getMetrics);
router.get('/my-tickets', verifyToken, ticketController.getMyTickets);
router.get('/admin', verifyToken, requireRole('Department', 'Superadmin'), ticketController.getAdminTickets);
router.get('/analytics', verifyToken, requireRole('Superadmin'), ticketController.getAnalytics);
router.get('/', verifyToken, requireRole('Department', 'Superadmin'), ticketController.getTickets);
router.post('/', verifyToken, upload.array('images', 5), ticketController.createTicket);
router.put('/:id', verifyToken, requireRole('Department', 'Superadmin'), ticketController.updateTicket);

module.exports = router;
