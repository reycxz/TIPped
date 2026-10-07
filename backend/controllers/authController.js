const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// @desc    Register a new user (Generates real OTP saved to DB)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, program, password, role, departmentCategory } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Database check before generating or sending the OTP
    const existingUser = (await User.findOne({ email: req.body.email })) || (await User.findOne({ email: normalizedEmail }));
    if (existingUser) {
      return res.status(400).json({
        message: 'Email already exists. Please log in.',
        error: 'Email already exists. Please log in.'
      });
    }

    // Generate secure 6-digit OTP with 10 minute expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      program: program ? program.trim() : 'Not Specified',
      password,
      role: role || 'User',
      departmentCategory: departmentCategory ? departmentCategory.trim() : null,
      otp,
      otpExpires,
      isVerified: false
    });

    await user.save();

    // Constraint 3: Send verification email using Nodemailer with strict text template
    try {
      const transporter = createEmailTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
        to: normalizedEmail,
        subject: 'TIPPED Registration - Verification Code',
        text: `Your 6-digit verification code is: ${otp}\n\nPlease enter this code to complete your registration. This code will expire in 10 minutes.`,
      });
      console.log(`[Nodemailer] Registration OTP sent to ${normalizedEmail}`);
    } catch (emailErr) {
      console.error('[Nodemailer Error]: Failed to send registration OTP email:', emailErr.message);
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
    res.status(500).json({ error: error.message });
  }
};

// @desc    Verify registration OTP and issue JWT
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      message: 'Verified',
      token,
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Constraint 5: Check if user registered with Google
    if (user.authProvider === 'google') {
      return res.status(400).json({
        message: 'Please log in using Google.',
        error: 'Please log in using Google.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Google Sign-In / OAuth
// @route   POST /api/users/google-auth or POST /api/auth/google-auth
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { email, firstName, lastName, name, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for Google Sign-In' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
      const userObj = user.toObject();
      delete userObj.password;
      return res.status(200).json({
        message: 'Google login successful',
        token,
        user: userObj
      });
    }

    let derivedFirstName = firstName ? firstName.trim() : '';
    let derivedLastName = lastName ? lastName.trim() : '';
    if (!derivedFirstName && name) {
      const parts = name.trim().split(' ');
      derivedFirstName = parts[0] || 'Google';
      derivedLastName = parts.slice(1).join(' ') || 'User';
    }
    if (!derivedFirstName) derivedFirstName = 'Google';
    if (!derivedLastName) derivedLastName = 'User';

    // Constraint 4: Explicitly sets authProvider: 'google' and does NOT attempt to pass a password field
    // Constraint 2: Explicitly set role: 'user'
    user = new User({
      firstName: derivedFirstName,
      lastName: derivedLastName,
      email: normalizedEmail,
      program: 'Not Specified',
      role: 'user',
      isVerified: true,
      authProvider: 'google',
      avatar: avatar || 'avatar-1'
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: 'Google login successful',
      token,
      user: userObj
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error during Google authentication' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private (JWT required)
exports.getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Forgot password - generate OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    res.json({ message: 'OTP sent', otp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    user.password = newPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Password saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
      return res.status(400).json({ error: 'Missing fields' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Update password (pre-save hook hashes with bcrypt, preserving _id and history)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all department accounts (Superadmin only)
// @route   GET /api/auth/departments
// @access  Private (Superadmin only)
exports.getDepartmentAccounts = async (req, res) => {
  try {
    const accounts = await User.find({ role: 'Department' }).select('-password').sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create department account (Superadmin only)
// @route   POST /api/auth/departments
// @access  Private (Superadmin only)
exports.createDepartmentAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, password, assignedCategories, departmentCategory } = req.body;
    
    // Extract categories array from assignedCategories, categories, or single departmentCategory
    let categories = [];
    if (Array.isArray(assignedCategories) && assignedCategories.length > 0) {
      categories = assignedCategories;
    } else if (Array.isArray(req.body.categories) && req.body.categories.length > 0) {
      categories = req.body.categories;
    } else if (departmentCategory) {
      categories = [departmentCategory.trim()];
    }

    if (!email || !password || categories.length === 0) {
      return res.status(400).json({ error: 'Missing fields: email, password, and at least one category are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const primaryCategory = categories[0] || 'General';

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
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ message: 'Account created', user: userObj });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update department account (Superadmin only)
// @route   PUT /api/auth/departments/:id
// @access  Private (Superadmin only)
exports.updateDepartmentAccount = async (req, res) => {
  try {
    const { firstName, lastName, assignedCategories, departmentCategory, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();

    if (assignedCategories || req.body.categories || departmentCategory) {
      let categories = [];
      if (Array.isArray(assignedCategories) && assignedCategories.length > 0) {
        categories = assignedCategories;
      } else if (Array.isArray(req.body.categories) && req.body.categories.length > 0) {
        categories = req.body.categories;
      } else if (departmentCategory) {
        categories = [departmentCategory.trim()];
      }

      if (categories.length > 0) {
        user.assignedCategories = categories;
        user.departmentCategory = categories[0];
      }
    }

    if (password) user.password = password; // pre-save hook hashes

    await user.save();
    const userObj = user.toObject();
    delete userObj.password;

    res.json({ message: 'Account updated', user: userObj });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = exports.deleteDepartmentAccount;


