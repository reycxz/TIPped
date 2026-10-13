'use strict';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const PRIVILEGED_ROLES = new Set(['admin', 'superadmin', 'department']);

const maxAttemptsFor = (role) =>
  PRIVILEGED_ROLES.has(String(role || '').toLowerCase()) ? 5 : 10;

// store: increment(userId, nowMs) -> new count (atomic); lock(userId, untilMs, nowMs); reset(userId)
const createLoginGuard = (store, clock = () => Date.now()) => {
  const attempt = async (user) => {
    const now = clock();
    const lockUntilMs = user.lockUntil ? new Date(user.lockUntil).getTime() : 0;
    const lastFailMs = user.lastFailedLoginAt ? new Date(user.lastFailedLoginAt).getTime() : 0;
    const attempts = Number(user.failedLoginAttempts) || 0;

    if (lockUntilMs > now) return { allowed: false, reason: 'locked' };

    const lockExpired = lockUntilMs > 0 && lockUntilMs <= now;
    const windowExpired = attempts > 0 && lastFailMs > 0 && now - lastFailMs > LOGIN_WINDOW_MS;
    if (lockExpired || windowExpired) await store.reset(user._id);

    const max = maxAttemptsFor(user.role);
    const count = await store.increment(user._id, now);
    if (count > max) {
      await store.lock(user._id, now + LOCK_DURATION_MS, now);
      return { allowed: false, reason: 'locked', count };
    }
    return { allowed: true, count, max };
  };

  const fail = async (user, info) => {
    if (info && info.count >= info.max) {
      const now = clock();
      await store.lock(user._id, now + LOCK_DURATION_MS, now);
      return { locked: true };
    }
    return { locked: false };
  };

  const succeed = (user) => store.reset(user._id);

  return { attempt, fail, succeed };
};

const createMongooseStore = (User) => ({
  increment: async (id, nowMs) => {
    const doc = await User.findOneAndUpdate(
      { _id: id },
      { $inc: { failedLoginAttempts: 1 }, $set: { lastFailedLoginAt: new Date(nowMs) } },
      { returnDocument: 'after' }
    ).select('+failedLoginAttempts').lean();
    return doc ? doc.failedLoginAttempts : Number.MAX_SAFE_INTEGER;
  },
  lock: async (id, untilMs, nowMs) => {
    await User.updateOne(
      { _id: id, $or: [{ lockUntil: null }, { lockUntil: { $lte: new Date(nowMs) } }] },
      { $set: { lockUntil: new Date(untilMs) } }
    );
  },
  reset: async (id) => {
    await User.updateOne(
      { _id: id },
      { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: '', lastFailedLoginAt: '' } }
    );
  }
});

module.exports = { createLoginGuard, createMongooseStore, maxAttemptsFor, LOGIN_WINDOW_MS, LOCK_DURATION_MS };
