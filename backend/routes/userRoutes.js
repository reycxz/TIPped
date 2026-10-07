const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// @desc    Delete user account (Hard delete)
// @route   DELETE /api/users/:id or /api/admin/users/:id
// @access  Private (Superadmin only)
router.delete('/:id', verifyToken, requireRole('Superadmin'), authController.deleteDepartmentAccount);

module.exports = router;
