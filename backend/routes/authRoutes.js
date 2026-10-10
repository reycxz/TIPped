const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Rate limiter specifically for password reset and OTP routes
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: "Too many password reset requests from this IP, please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/google-auth', authController.googleAuth);
router.post('/consent', authController.acceptPrivacyConsent);
router.post('/decline', authController.declinePrivacyConsent);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

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
