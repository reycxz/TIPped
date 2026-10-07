const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate secure 6-digit OTP with 10 minute expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let user = existingUser;
    if (user) {
      user.firstName = firstName.trim();
      user.lastName = lastName.trim();
      user.program = program ? program.trim() : '';
      user.password = password; // pre-save hook re-hashes
      user.role = role || 'User';
      user.departmentCategory = departmentCategory ? departmentCategory.trim() : null;
      user.otp = otp;
      user.otpExpires = otpExpires;
      user.isVerified = false;
    } else {
      user = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        program: program ? program.trim() : '',
        password,
        role: role || 'User',
        departmentCategory: departmentCategory ? departmentCategory.trim() : null,
        otp,
        otpExpires,
        isVerified: false
      });
    }

    await user.save();

    res.status(201).json({
      message: 'OTP sent',
      otp,
      email: normalizedEmail
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User already exists' });
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// @desc    Update profile (firstName, lastName, avatar)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (avatar) user.avatar = avatar;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      message: 'Profile updated',
      user: userObj,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
    const { firstName, lastName, email, password, departmentCategory } = req.body;
    if (!email || !password || !departmentCategory) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      firstName: firstName ? firstName.trim() : departmentCategory.trim(),
      lastName: lastName ? lastName.trim() : 'Staff',
      email: normalizedEmail,
      password,
      role: 'Department',
      departmentCategory: departmentCategory.trim(),
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
    const { firstName, lastName, departmentCategory, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (departmentCategory) user.departmentCategory = departmentCategory.trim();
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
// @route   DELETE /api/auth/departments/:id
// @access  Private (Superadmin only)
exports.deleteDepartmentAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


