const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken } = require('../middleware/auth');

router.get('/metrics', verifyToken, ticketController.getMetrics);
router.get('/my-tickets', verifyToken, ticketController.getMyTickets);

module.exports = router;
