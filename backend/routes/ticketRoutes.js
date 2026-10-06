const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/metrics', verifyToken, ticketController.getMetrics);
router.get('/my-tickets', verifyToken, ticketController.getMyTickets);
router.get('/admin', verifyToken, requireRole('Department', 'Superadmin'), ticketController.getAdminTickets);
router.post('/', verifyToken, ticketController.createTicket);
router.put('/:id', verifyToken, requireRole('Department', 'Superadmin'), ticketController.updateTicket);

module.exports = router;
