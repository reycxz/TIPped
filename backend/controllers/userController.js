const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Google Sign-In / OAuth
// @route   POST /api/users/google-auth
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

    // Auto-create user with role: 'user', authProvider: 'google', and omit password
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

// @desc    Update user profile
// @route   PUT /api/users/profile or PATCH /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, program, avatar } = req.body;

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (program) user.program = program;
    if (avatar) user.avatar = avatar;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: userObj,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error updating profile' });
  }
};

const authController = require('./authController');
exports.login = authController.login;
