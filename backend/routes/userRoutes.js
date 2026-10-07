const express = require('express');
const router = express.Router();
const { googleAuth, updateUserProfile } = require('../controllers/userController');
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Public routes
router.post('/google-auth', googleAuth);
router.post('/login', authController.login);

// @desc    Update user profile (firstName, lastName, program)
// @route   PUT /api/users/profile, PATCH /api/users/profile
// @access  Private
router.put('/profile', verifyToken, updateUserProfile);
router.patch('/profile', verifyToken, updateUserProfile);
router.put('/change-password', verifyToken, authController.changePassword);
router.patch('/change-password', verifyToken, authController.changePassword);

// @desc    Delete user account (Hard delete)
// @route   DELETE /api/users/:id or /api/admin/users/:id
// @access  Private (Superadmin only)
router.delete('/:id', verifyToken, requireRole('Superadmin'), authController.deleteDepartmentAccount);

module.exports = router;
