const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
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
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user document
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      program: program ? program.trim() : '',
      password,
      role: role || 'User',
      departmentCategory: departmentCategory ? departmentCategory.trim() : null
    });

    await user.save();

    // Issue JWT expiring in 1d
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userObj
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User already exists' });
    }
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
