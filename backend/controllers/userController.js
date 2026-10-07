const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Google Sign-In / OAuth
// @route   POST /api/users/google-auth
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
    } catch (e) {
      // Network or fetch fallback handled below
    }

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

    const verifiedEmail = googleUser.email.toLowerCase().trim();

    // Enforce Institutional Domain Restriction (@tip.edu.ph)
    if (!verifiedEmail.endsWith('@tip.edu.ph')) {
      return res.status(403).json({
        error: 'Forbidden: Access restricted strictly to institutional @tip.edu.ph Google accounts'
      });
    }

    let user = await User.findOne({ email: verifiedEmail });

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

    const authToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: 'Google login successful',
      token: authToken,
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
