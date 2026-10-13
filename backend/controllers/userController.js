const User = require('../models/User');

const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.otp;
  delete userObj.otpExpires;
  delete userObj.__v;
  return userObj;
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

    const userObj = sanitizeUser(user);

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: userObj,
    });
  } catch (error) {
    console.error('[auth]', { event: 'profile_update_error', name: error && error.name, at: new Date().toISOString() });
    return res.status(500).json({ error: 'Server error updating profile' });
  }
};

const authController = require('./authController');
exports.login = authController.login;
