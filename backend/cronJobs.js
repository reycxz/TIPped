const cron = require('node-cron');
const User = require('./models/User');
const Report = require('./models/Report');

const privacyConsentCleanupTask = cron.schedule('0 0 * * *', async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const users = await User.find({
      role: { $in: ['User', 'user'] },
      hasAcceptedPrivacyPolicy: { $ne: true },
      declinedAt: { $lt: cutoff }
    }).select('_id');

    for (const user of users) {
      try {
        await Report.updateMany(
          { $or: [{ submittedBy: user._id }, { reportedBy: user._id }] },
          {
            $set: {
              submittedBy: null,
              reportedBy: null,
              guestEmail: null
            }
          }
        );
        await User.findByIdAndDelete(user._id);
        console.log(`Deleted declined unconsented user ${user._id} after anonymizing reports`);
      } catch (error) {
        console.error(`Privacy cleanup failed for user ${user._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Privacy consent cleanup job failed:', error);
  }
});

module.exports = privacyConsentCleanupTask;
