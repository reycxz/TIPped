const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/ownership');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP, please try again later.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registrations from this IP, please try again later.' }
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP verification attempts from this IP, please try again later.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests from this IP, please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', registerLimiter, authController.register);
router.post('/verify-otp', verifyOtpLimiter, authController.verifyOtp);
router.post('/login', loginLimiter, authController.login);
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
router.put('/departments/:id', verifyToken, requireRole('Superadmin'), validateObjectId, authController.updateDepartmentAccount);
router.delete('/departments/:id', verifyToken, requireRole('Superadmin'), validateObjectId, authController.deleteDepartmentAccount);
router.delete('/users/:id', verifyToken, requireRole('Superadmin'), validateObjectId, authController.deleteDepartmentAccount);

module.exports = router;
