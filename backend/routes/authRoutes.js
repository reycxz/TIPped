const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/google-auth', authController.googleAuth);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', verifyToken, authController.getMe);
router.put('/profile', verifyToken, authController.updateProfile);
router.patch('/profile', verifyToken, authController.updateProfile);
router.put('/change-password', verifyToken, authController.changePassword);

// Superadmin department account management
router.get('/departments', verifyToken, requireRole('Superadmin'), authController.getDepartmentAccounts);
router.post('/departments', verifyToken, requireRole('Superadmin'), authController.createDepartmentAccount);
router.put('/departments/:id', verifyToken, requireRole('Superadmin'), authController.updateDepartmentAccount);
router.delete('/departments/:id', verifyToken, requireRole('Superadmin'), authController.deleteDepartmentAccount);
router.delete('/users/:id', verifyToken, requireRole('Superadmin'), authController.deleteDepartmentAccount);

module.exports = router;
