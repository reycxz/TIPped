const crypto = require('crypto');
const User = require('../models/User');
const Department = require('../models/Department');
const Category = require('../models/Category');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const {
  getDepartmentCategoryNames,
  findDepartmentAccounts,
} = require('../utils/departmentAccountSync');
const { createLoginGuard, createMongooseStore } = require('../utils/loginLockout');
const { verifyGoogleAudience } = require('../utils/googleAudience');

const loginGuard = createLoginGuard(createMongooseStore(User));
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);
const INVALID = { message: 'Invalid credentials', error: 'Invalid credentials' };

const logLoginEvent = (event, req, user) => {
  console.warn('[auth]', {
    event,
    ...(user ? { userId: String(user._id), role: user.role } : {}),
    ip: req.ip,
    at: new Date().toISOString()
  });
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.otp;
  delete userObj.otpExpires;
  delete userObj.__v;
  delete userObj.failedLoginAttempts;
  delete userObj.lockUntil;
  delete userObj.lastFailedLoginAt;
  return userObj;
};

const otpAttemptStore = new Map();
const OTP_ATTEMPT_LIMIT = 5;
const OTP_ATTEMPT_WINDOW = 15 * 60 * 1000;
const OTP_ATTEMPT_STORE_MAX = 5000;

const getOtpAttemptState = (email) => {
  const key = String(email || '').trim().toLowerCase();
  const state = otpAttemptStore.get(key);

  if (!state) {
    return { count: 0, firstAttemptAt: Date.now() };
  }

  if (Date.now() - state.firstAttemptAt > OTP_ATTEMPT_WINDOW) {
    otpAttemptStore.delete(key);
    return { count: 0, firstAttemptAt: Date.now() };
  }

  return state;
};

const trackOtpFailure = (email) => {
  const key = String(email || '').trim().toLowerCase();
  const state = getOtpAttemptState(key);
  const nextCount = state.count + 1;
  const now = Date.now();

  for (const [storedKey, attempt] of otpAttemptStore) {
    if (now - attempt.firstAttemptAt > OTP_ATTEMPT_WINDOW) {
      otpAttemptStore.delete(storedKey);
    }
  }

  if (!otpAttemptStore.has(key) && otpAttemptStore.size >= OTP_ATTEMPT_STORE_MAX) {
    return false;
  }

  otpAttemptStore.set(key, { count: nextCount, firstAttemptAt: state.firstAttemptAt });
  return nextCount >= OTP_ATTEMPT_LIMIT;
};

const clearOtpFailureState = (email) => {
  const key = String(email || '').trim().toLowerCase();
  otpAttemptStore.delete(key);
};

const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const STAFF_ROLES = new Set(['admin', 'superadmin', 'department']);

const isStaffRole = (role) => STAFF_ROLES.has((role || '').toLowerCase());

const sendAuthResponse = (res, user, statusCode = 200) => {
  const userObj = sanitizeUser(user);

  if (!isStaffRole(user.role) && !user.hasAcceptedPrivacyPolicy) {
    const consentToken = jwt.sign(
      { id: user._id, purpose: 'privacy-consent' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    return res.status(statusCode).json({
      message: 'Privacy consent required',
      requiresConsent: true,
      consentToken,
      user: userObj
    });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return res.status(statusCode).json({
    message: 'Login successful',
    token,
    user: userObj
  });
};

// @desc    Register a new user (Generates real OTP saved to DB)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, program, password } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Institutional Domain Boundary Check (@tip.edu.ph)
    if (!normalizedEmail.endsWith('@tip.edu.ph')) {
      return res.status(403).json({
        error: 'Forbidden: Access restricted strictly to institutional @tip.edu.ph accounts'
      });
    }

    // Database check before generating or sending the OTP
    const existingUser = (await User.findOne({ email: req.body.email })) || (await User.findOne({ email: normalizedEmail }));
    const pendingExpired = Boolean(
      existingUser &&
      existingUser.isVerified === false &&
      !isStaffRole(existingUser.role) &&
      (!existingUser.otpExpires || existingUser.otpExpires < new Date())
    );
    if (pendingExpired) {
      await User.deleteOne({ _id: existingUser._id });
    }
    if (existingUser && !pendingExpired) {
      return res.status(400).json({
        message: 'Email already exists. Please log in.',
        error: 'Email already exists. Please log in.'
      });
    }

    // Generate secure 6-digit OTP with 10 minute expiration
    const otp = crypto.randomInt(100000, 1000000).toString().padStart(6, '0');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Explicitly enforce role: 'user' to prevent privilege escalation via mass assignment
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      program: program ? program.trim() : 'Not Specified',
      password,
      role: 'user',
      otp,
      otpExpires,
      isVerified: false
    });

    await user.save();

    // Send verification email asynchronously without blocking HTTP response
    try {
      const transporter = createEmailTransporter();
      transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
        to: normalizedEmail,
        subject: 'TIPPED Registration - Verification Code',
        text: `Your 6-digit verification code is: ${otp}\n\nPlease enter this code to complete your registration. This code will expire in 10 minutes.`,
      }).catch((emailErr) => {
        console.error('[Nodemailer Error]: Failed to send registration OTP email:', emailErr.message);
      });
      console.log(`[Nodemailer] Registration OTP dispatched to ${normalizedEmail}`);
    } catch (emailErr) {
      console.error('[Nodemailer Error]: Failed to dispatch registration OTP email:', emailErr.message);
    }

    // Constraint 2: Do NOT return raw OTP in JSON response
    res.status(201).json({
      message: 'OTP sent',
      email: normalizedEmail
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email already exists. Please log in.',
        error: 'Email already exists. Please log in.'
      });
    }
    next(error);
  }
};

// @desc    Verify registration OTP and issue JWT
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const blockedState = getOtpAttemptState(normalizedEmail);
    if (blockedState.count >= OTP_ATTEMPT_LIMIT) {
      return res.status(429).json({ error: 'Too many invalid OTP attempts. Please try again later.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      const exhausted = trackOtpFailure(normalizedEmail);
      if (exhausted) {
        return res.status(429).json({ error: 'Too many invalid OTP attempts. Please try again later.' });
      }
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      const exhausted = trackOtpFailure(normalizedEmail);
      if (exhausted) {
        return res.status(429).json({ error: 'Too many invalid OTP attempts. Please try again later.' });
      }
      return res.status(400).json({ error: 'OTP expired' });
    }

    clearOtpFailureState(normalizedEmail);
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    if (password.length > 1000) {
      return res.status(401).json(INVALID);
    }

    const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil +lastFailedLoginAt');
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      logLoginEvent('unknown_account', req);
      return res.status(401).json(INVALID);
    }

    // Constraint 5: Check if user registered with Google
    if (user.authProvider === 'google') {
      return res.status(400).json({
        message: 'Please log in using Google.',
        error: 'Please log in using Google.'
      });
    }

    const gate = await loginGuard.attempt(user);
    if (!gate.allowed) {
      await bcrypt.compare(password, DUMMY_HASH);
      logLoginEvent('blocked', req, user);
      return res.status(401).json(INVALID);
    }

    const result = await bcrypt.compare(password, user.password || DUMMY_HASH);
    const isMatch = Boolean(user.password) && result;
    if (!isMatch) {
      const failure = await loginGuard.fail(user, gate);
      logLoginEvent(failure.locked ? 'locked' : 'failed', req, user);
      return res.status(401).json(INVALID);
    }

    if (user.isVerified !== true) {
      await loginGuard.succeed(user);
      logLoginEvent('unverified_account', req, user);
      return res.status(401).json(INVALID);
    }

    await loginGuard.succeed(user);
    return sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
};

// @desc    Google Sign-In / OAuth
// @route   POST /api/users/google-auth or POST /api/auth/google-auth
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { token, credential, email, firstName, lastName, name, avatar } = req.body;
    const authHeader = req.headers.authorization;
    const googleToken = token || credential || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

    if (!googleToken) {
      return res.status(401).json({ error: 'Google OAuth token is required for verification' });
    }

    // Verify token against official Google endpoints
    let googleUser = null;
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (userinfoRes.ok) {
        googleUser = await userinfoRes.json();
      }
    } catch (e) {}

    if (!googleUser || !googleUser.email) {
      try {
        const tokeninfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleToken)}`);
        if (tokeninfoRes.ok) {
          googleUser = await tokeninfoRes.json();
        }
      } catch (e) {}
    }

    if (!googleUser || !googleUser.email) {
      return res.status(401).json({ error: 'Invalid or expired Google OAuth token' });
    }

    const audience = await verifyGoogleAudience(googleToken, googleUser);
    if (audience.notConfigured) {
      console.error('[auth]', { event: 'google_client_id_missing', at: new Date().toISOString() });
      return res.status(503).json({ error: 'Google sign-in is not available right now' });
    }
    if (!audience.ok) {
      return res.status(401).json({ error: 'Invalid or expired Google OAuth token' });
    }

    const emailVerified = googleUser.email_verified === true || googleUser.email_verified === 'true';
    if (!emailVerified) {
      return res.status(403).json({ error: 'Your Google account email is not verified' });
    }

    const verifiedEmail = googleUser.email.toLowerCase().trim();

    // Enforce Institutional Domain Restriction (@tip.edu.ph)
    if (!verifiedEmail.endsWith('@tip.edu.ph')) {
      return res.status(403).json({
        error: 'Forbidden: Access restricted strictly to institutional @tip.edu.ph Google accounts'
      });
    }

    let user = await User.findOne({ email: verifiedEmail });

    if (user) {
      if (isStaffRole(user.role)) {
        return res.status(403).json({ error: 'Staff accounts must sign in with email and password' });
      }

      if (user.isVerified === false) {
        // Google has just proven control of this institutional mailbox, so any password or OTP set on an unverified local record belongs to someone else.
        await User.updateOne(
          { _id: user._id },
          { $set: { isVerified: true, authProvider: 'google' }, $unset: { password: '', otp: '', otpExpires: '' } }
        );
        user = await User.findById(user._id);
        if (!user) {
          return res.status(401).json({ error: 'Invalid or expired Google OAuth token' });
        }
      }

      return sendAuthResponse(res, user);
    }

    let derivedFirstName = googleUser.given_name || firstName ? (googleUser.given_name || firstName).trim() : '';
    let derivedLastName = googleUser.family_name || lastName ? (googleUser.family_name || lastName).trim() : '';
    if (!derivedFirstName && (googleUser.name || name)) {
      const parts = (googleUser.name || name).trim().split(' ');
      derivedFirstName = parts[0] || 'Google';
      derivedLastName = parts.slice(1).join(' ') || 'User';
    }
    if (!derivedFirstName) derivedFirstName = 'Google';
    if (!derivedLastName) derivedLastName = 'User';

    // Safe account provisioning: role defaults strictly to 'user', authProvider to 'google', omit password
    user = new User({
      firstName: derivedFirstName,
      lastName: derivedLastName,
      email: verifiedEmail,
      program: 'Not Specified',
      role: 'user',
      isVerified: true,
      authProvider: 'google',
      avatar: googleUser.picture || avatar || 'avatar-1'
    });

    await user.save();

    return sendAuthResponse(res, user, 201);
  } catch (error) {
    console.error('[auth]', { event: 'google_auth_error', name: error && error.name, at: new Date().toISOString() });
    return res.status(500).json({ error: 'Server error during Google authentication' });
  }
};

// @desc    Accept privacy consent for Google authentication
// @route   POST /api/auth/consent
// @access  Public (temporary consent token required)
exports.acceptPrivacyConsent = async (req, res, next) => {
  try {
    const { consentToken } = req.body;
    if (typeof consentToken !== 'string' || !consentToken) {
      return res.status(401).json({ error: 'A valid consent token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(consentToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired consent token' });
    }

    if (decoded.purpose !== 'privacy-consent' || !decoded.id) {
      return res.status(401).json({ error: 'Invalid consent token' });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: decoded.id,
        role: { $in: ['User', 'user'] },
        hasAcceptedPrivacyPolicy: { $ne: true }
      },
      {
        $set: {
          hasAcceptedPrivacyPolicy: true,
          consentTimestamp: new Date()
        },
        $unset: {
          declinedAt: 1
        }
      },
      { new: true }
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid or already used consent session' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const userObj = sanitizeUser(user);

    return res.json({ token, user: userObj });
  } catch (error) {
    return next(error);
  }
};

exports.declinePrivacyConsent = async (req, res, next) => {
  try {
    const { consentToken } = req.body;
    if (typeof consentToken !== 'string' || !consentToken) {
      return res.status(401).json({ error: 'A valid consent token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(consentToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired consent token' });
    }

    if (decoded.purpose !== 'privacy-consent' || !decoded.id) {
      return res.status(401).json({ error: 'Invalid consent token' });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: decoded.id,
        role: { $in: ['User', 'user'] },
        hasAcceptedPrivacyPolicy: { $ne: true }
      },
      { $set: { declinedAt: new Date() } },
      { new: true }
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired consent session' });
    }

    return res.status(200).json({ message: 'Privacy consent declined' });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private (JWT required)
exports.getMe = async (req, res) => {
  try {
    res.json(sanitizeUser(req.user));
  } catch (error) {
    console.error('[auth]', { event: 'server_error', handler: 'getMe', name: error && error.name, at: new Date().toISOString() });
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Forgot password - generate OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    const genericMessage = { message: 'If that email is registered, a reset code has been sent.' };

    if (!user) {
      return res.status(200).json(genericMessage);
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString().padStart(6, '0');
    clearOtpFailureState(normalizedEmail);
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    try {
      const transporter = createEmailTransporter();
      transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
        to: normalizedEmail,
        subject: 'TIPPED - Password Reset Verification Code',
        text: `Your 6-digit password reset code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      }).catch((emailErr) => {
        console.error('[Nodemailer Error]: Failed to send password reset OTP:', emailErr.message);
      });
    } catch (emailErr) {
      console.error('[Nodemailer Error]: Failed to dispatch password reset OTP:', emailErr.message);
    }

    // Never expose raw OTP in HTTP response
    res.status(200).json(genericMessage);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (getOtpAttemptState(normalizedEmail).count >= OTP_ATTEMPT_LIMIT) {
      return res.status(429).json({ error: 'Too many invalid OTP attempts. Please try again later.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const exhausted = trackOtpFailure(normalizedEmail);
      if (exhausted) {
        return res.status(429).json({ error: 'Too many invalid OTP attempts. Please try again later.' });
      }
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      const exhausted = trackOtpFailure(normalizedEmail);
      if (exhausted) {
        return res.status(429).json({ error: 'Too many invalid OTP attempts. Please try again later.' });
      }
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      const exhausted = trackOtpFailure(normalizedEmail);
      if (exhausted) {
        return res.status(429).json({ error: 'Too many invalid OTP attempts. Please try again later.' });
      }
      return res.status(400).json({ error: 'OTP expired' });
    }

    clearOtpFailureState(normalizedEmail);
    user.password = newPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    try {
      await loginGuard.succeed(user);
    } catch (unlockError) {
      console.warn('[auth]', { event: 'lock_clear_failed', userId: String(user._id), at: new Date().toISOString() });
    }

    res.json({ message: 'Password saved' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile (firstName, lastName, avatar, program)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, avatar, program } = req.body;

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (avatar) user.avatar = avatar;
    user.program = req.body.program || user.program;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      message: 'Profile updated successfully',
      user: userObj,
    });
  } catch (error) {
    console.error('[auth]', { event: 'server_error', handler: 'updateProfile', name: error && error.name, at: new Date().toISOString() });
    res.status(500).json({ error: 'Server error' });
  }
};

// Aliases for compatibility
exports.updateUserProfile = exports.updateProfile;
exports.registerUser = exports.register;

// @desc    Change password (authenticated) - Unified password update preserving _id
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing fields', message: 'Missing fields' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long', message: 'New password must be at least 8 characters long' });
    }

    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found', message: 'User not found' });
    }

    // Use bcrypt.compare(currentPassword, user.password) to strictly validate the current password against the database hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password', message: 'Incorrect current password' });
    }

    // Only hash and save the newPassword if this check passes
    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: 'Password saved' });
  } catch (error) {
    console.error('[auth]', { event: 'server_error', handler: 'changePassword', name: error && error.name, at: new Date().toISOString() });
    return res.status(500).json({ error: 'Server error', message: 'Server error' });
  }
};

// @desc    Get all department accounts (Superadmin only)
// @route   GET /api/auth/departments
// @access  Private (Superadmin only)
exports.getDepartmentAccounts = async (req, res) => {
  try {
    const accounts = await User.find({ role: { $regex: /^department$/i } })
      .select('_id firstName lastName email departmentCategory')
      .sort({ createdAt: -1 });
    res.json(accounts.map(sanitizeUser));
  } catch (error) {
    console.error('[auth]', { event: 'server_error', handler: 'getDepartmentAccounts', name: error && error.name, at: new Date().toISOString() });
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Create department account (Superadmin only)
// @route   POST /api/auth/departments
// @access  Private (Superadmin only)
exports.createDepartmentAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, password, departmentName } = req.body;
    const requestedCategories = Array.isArray(req.body.assignedCategories) && req.body.assignedCategories.length > 0
      ? req.body.assignedCategories
      : (Array.isArray(req.body.categories) && req.body.categories.length > 0
        ? req.body.categories
        : []);
    const firstRequestedCategory = requestedCategories[0] || req.body.departmentCategory;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields: email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let department = null;
    if (departmentName) {
      const cleanDepartmentName = departmentName.trim();
      department = await Department.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(cleanDepartmentName)}$`, 'i') },
      });
      if (!department) {
        return res.status(400).json({ error: `Department '${cleanDepartmentName}' does not exist` });
      }
    } else if (typeof firstRequestedCategory === 'string' && firstRequestedCategory.trim()) {
      const category = await Category.findOne({ issueName: firstRequestedCategory.trim() });
      if (category) {
        department = await Department.findOne({ name: category.departmentName });
      }
    }

    if (!department) {
      return res.status(400).json({ error: 'Department name is required or could not be determined from the category' });
    }

    const categories = await getDepartmentCategoryNames(department.name);
    if (categories.length === 0) {
      return res.status(400).json({ error: 'Department must have at least one category' });
    }

    const existingDepartmentAccounts = await findDepartmentAccounts(categories);
    if (existingDepartmentAccounts.length > 0) {
      return res.status(409).json({ error: 'A department account already exists for this department' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const primaryCategory = categories[0];

    const user = new User({
      firstName: firstName ? firstName.trim() : primaryCategory,
      lastName: lastName ? lastName.trim() : 'Staff',
      email: normalizedEmail,
      password,
      role: 'Department',
      assignedCategories: categories,
      departmentCategory: primaryCategory,
      isVerified: true
    });

    await user.save();
    const userObj = sanitizeUser(user);

    res.status(201).json({ message: 'Account created', user: userObj });
  } catch (error) {
    console.error('[auth]', { event: 'server_error', handler: 'createDepartmentAccount', name: error && error.name, at: new Date().toISOString() });
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update department account (Superadmin only)
// @route   PUT /api/auth/departments/:id
// @access  Private (Superadmin only)
exports.updateDepartmentAccount = async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();

    if (password) user.password = password; // pre-save hook hashes

    await user.save();
    const userObj = sanitizeUser(user);

    res.json({ message: 'Account updated', user: userObj });
  } catch (error) {
    console.error('[auth]', { event: 'server_error', handler: 'updateDepartmentAccount', name: error && error.name, at: new Date().toISOString() });
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete/Destroy department account (Superadmin only)
// @route   DELETE /api/users/:id or /api/admin/users/:id or /api/auth/departments/:id
// @access  Private (Superadmin only)
exports.deleteDepartmentAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    console.error('[auth]', { event: 'server_error', handler: 'deleteDepartmentAccount', name: error && error.name, at: new Date().toISOString() });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteUser = exports.deleteDepartmentAccount;
