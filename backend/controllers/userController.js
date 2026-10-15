const User = require('../models/User');
const { getNextProgramChangeAt, updateProgram } = require('../utils/programChange');

const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.otp;
  delete userObj.otpExpires;
  delete userObj.otpLastSentAt;
  delete userObj.__v;
  delete userObj.programChangedAt;
  userObj.nextProgramChangeAt = getNextProgramChangeAt(user.programChangedAt);
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

    const { firstName, lastName, avatar } = req.body;
    const programError = updateProgram(user, req.body);
    if (programError) {
      return res.status(programError.status).json(programError.body);
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
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
