'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, beforeEach, test } = require('node:test');

const authControllerPath = path.resolve(__dirname, '../controllers/authController.js');
const users = new Map();
let currentGoogleProfile;
let audienceResult;
let updateOneCalls;
let deleteOneCalls;
let findByIdError;
let saveCalls;
let nextUserId;
let sentEmails;

const matchingUser = (filter) => {
  for (const user of users.values()) {
    if (filter && filter.email === user.email) return user;
    if (filter && filter._id === user._id) return user;
  }
  return null;
};

function MockUser(fields = {}) {
  Object.assign(this, fields);
  this._id = this._id || `user-${nextUserId++}`;
}

MockUser.prototype.save = async function () {
  saveCalls += 1;
  users.set(String(this._id), this);
  return this;
};

MockUser.prototype.toObject = function () {
  return { ...this };
};

MockUser.findOne = async (filter) => matchingUser(filter);
MockUser.findById = (id) => {
  const user = users.get(String(id)) || null;
  return {
    select: async () => {
      if (findByIdError) throw findByIdError;
      return user;
    },
    then(resolve, reject) {
      if (findByIdError) return Promise.reject(findByIdError).then(resolve, reject);
      return Promise.resolve(user).then(resolve, reject);
    }
  };
};
MockUser.updateOne = async (filter, update) => {
  updateOneCalls += 1;
  const user = matchingUser(filter);
  if (user) {
    Object.assign(user, update.$set || {});
    for (const field of Object.keys(update.$unset || {})) {
      delete user[field];
    }
  }
  return { acknowledged: true, matchedCount: user ? 1 : 0, modifiedCount: user ? 1 : 0 };
};
MockUser.deleteOne = async (filter) => {
  deleteOneCalls += 1;
  const user = matchingUser(filter);
  if (user) users.delete(String(user._id));
  return { acknowledged: true, deletedCount: user ? 1 : 0 };
};

const mocks = {
  '../models/User': MockUser,
  '../models/Department': {},
  '../models/Category': {},
  '../utils/departmentAccountSync': {
    getDepartmentCategoryNames: async () => [],
    findDepartmentAccounts: async () => []
  },
  '../utils/loginLockout': {
    createLoginGuard: () => ({ attempt: async () => ({ allowed: true }), fail: async () => ({}), succeed: async () => {} }),
    createMongooseStore: () => ({})
  },
  '../utils/googleAudience': {
    verifyGoogleAudience: async () => audienceResult
  },
  bcrypt: {
    hashSync: () => 'dummy-hash',
    compare: async () => true
  },
  jsonwebtoken: {
    sign: (payload) => payload.purpose === 'privacy-consent' ? 'consent-token' : 'access-token'
  },
  '../utils/emailService': {
    createEmailTransporter: () => ({
      sendMail: async (message) => {
        sentEmails.push(message);
      }
    }),
    getEmailSender: () => 'test-sender'
  }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent && parent.filename === authControllerPath && Object.hasOwn(mocks, request)) {
    return mocks[request];
  }
  return originalLoad.call(this, request, parent, isMain);
};

let authController;
try {
  authController = require(authControllerPath);
} finally {
  Module._load = originalLoad;
}

const originalFetch = global.fetch;
const originalConsoleError = console.error;

beforeEach(() => {
  users.clear();
  currentGoogleProfile = {
    email: 'student@tip.edu.ph',
    email_verified: true,
    given_name: 'Test',
    family_name: 'Student'
  };
  audienceResult = { ok: true, notConfigured: false };
  updateOneCalls = 0;
  deleteOneCalls = 0;
  findByIdError = null;
  saveCalls = 0;
  nextUserId = 1;
  sentEmails = [];
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ ...currentGoogleProfile })
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  console.error = originalConsoleError;
});

const makeUser = (fields = {}) => {
  const user = new MockUser({
    _id: `user-${nextUserId++}`,
    email: 'student@tip.edu.ph',
    password: 'local-password',
    otp: '123456',
    otpExpires: new Date(Date.now() + 60_000),
    role: 'user',
    authProvider: 'local',
    isVerified: false,
    hasAcceptedPrivacyPolicy: true,
    ...fields
  });
  users.set(String(user._id), user);
  return user;
};

const makeResponse = () => {
  let statusCode;
  let body;
  return {
    res: {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      }
    },
    result: () => ({ statusCode, body })
  };
};

const submitGoogleAuth = async () => {
  const response = makeResponse();
  await authController.googleAuth({
    body: { token: 'stub-google-token' },
    headers: {}
  }, response.res);
  return response.result();
};

const submitRegister = async () => {
  const response = makeResponse();
  await authController.register({
    body: {
      firstName: 'New',
      lastName: 'Student',
      email: 'student@tip.edu.ph',
      program: 'Engineering',
      password: 'new-password'
    }
  }, response.res, (error) => {
    throw error;
  });
  return response.result();
};

const submitResendOtp = async (email = 'student@tip.edu.ph') => {
  const response = makeResponse();
  await authController.resendOtp({
    body: { email },
    ip: '127.0.0.1',
    headers: {}
  }, response.res, (error) => {
    throw error;
  });
  return response.result();
};

test('Google upgrades an existing unverified local account and clears local credentials', async () => {
  const user = makeUser();

  const response = await submitGoogleAuth();

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.token, 'access-token');
  assert.equal(user.isVerified, true);
  assert.equal(user.authProvider, 'google');
  assert.equal(Object.hasOwn(user, 'password'), false);
  assert.equal(Object.hasOwn(user, 'otp'), false);
  assert.equal(Object.hasOwn(user, 'otpExpires'), false);
  assert.equal(updateOneCalls, 1);
});

test('Google refuses staff accounts without changing them', async (t) => {
  for (const role of ['admin', 'superadmin', 'department']) {
    await t.test(role, async () => {
      const user = makeUser({ role });
      const before = { ...user };

      const response = await submitGoogleAuth();

      assert.equal(response.statusCode, 403);
      assert.deepEqual({ ...user }, before);
      assert.equal(updateOneCalls, 0);
    });
  }
});

test('Google rejects an unverified Google email', async () => {
  makeUser();
  currentGoogleProfile.email_verified = false;

  const response = await submitGoogleAuth();

  assert.equal(response.statusCode, 403);
  assert.equal(updateOneCalls, 0);
});

test('Google rejects an email outside the institutional domain', async () => {
  currentGoogleProfile.email = 'student@example.com';

  const response = await submitGoogleAuth();

  assert.equal(response.statusCode, 403);
});

test('Google audience failure returns 401', async () => {
  audienceResult = { ok: false, notConfigured: false };

  const response = await submitGoogleAuth();

  assert.equal(response.statusCode, 401);
});

test('missing Google audience configuration returns 503', async () => {
  audienceResult = { ok: false, notConfigured: true };

  const response = await submitGoogleAuth();

  assert.equal(response.statusCode, 503);
});

test('verified Google account signs in without upgrade side effects', async () => {
  const user = makeUser({
    password: undefined,
    otp: null,
    otpExpires: null,
    isVerified: true,
    authProvider: 'google'
  });

  const response = await submitGoogleAuth();

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.token, 'access-token');
  assert.equal(user.isVerified, true);
  assert.equal(user.authProvider, 'google');
  assert.equal(updateOneCalls, 0);
});

test('expired pending registration is deleted and a fresh registration proceeds', async () => {
  const expiredUser = makeUser({
    otpExpires: new Date(Date.now() - 60_000)
  });

  const response = await submitRegister();

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.message, 'OTP sent');
  assert.equal(deleteOneCalls, 1);
  assert.equal(users.has(String(expiredUser._id)), false);
  assert.equal(users.size, 1);
  assert.equal([...users.values()][0].isVerified, false);
  assert.ok([...users.values()][0].otpLastSentAt instanceof Date);
  assert.equal(saveCalls, 1);
});

test('resend OTP returns the generic response for an unknown email', async () => {
  const response = await submitResendOtp(' UNKNOWN@TIP.EDU.PH ');

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    message: 'If this account is awaiting verification, a new code has been sent.'
  });
  assert.equal(sentEmails.length, 0);
});

test('resend OTP returns the generic response for an already verified account', async () => {
  makeUser({ isVerified: true });

  const response = await submitResendOtp();

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    message: 'If this account is awaiting verification, a new code has been sent.'
  });
  assert.equal(sentEmails.length, 0);
});

test('resend OTP returns the generic response for an unverified Google account', async () => {
  makeUser({ authProvider: 'google' });

  const response = await submitResendOtp();

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    message: 'If this account is awaiting verification, a new code has been sent.'
  });
  assert.equal(sentEmails.length, 0);
});

test('resend OTP updates and emails a new code for an unverified account', async () => {
  const user = makeUser({ otpLastSentAt: new Date(Date.now() - 61_000) });
  const previousOtp = user.otp;

  const response = await submitResendOtp(' STUDENT@TIP.EDU.PH ');

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    message: 'If this account is awaiting verification, a new code has been sent.'
  });
  assert.notEqual(user.otp, previousOtp);
  assert.ok(user.otpExpires > new Date());
  assert.ok(user.otpLastSentAt instanceof Date);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'student@tip.edu.ph');
  assert.equal(sentEmails[0].subject, 'TIPPED Registration - Verification Code');
});

test('resend OTP returns 429 when requested again within 60 seconds', async () => {
  const user = makeUser({ otpLastSentAt: new Date() });
  const previousOtp = user.otp;

  const response = await submitResendOtp();

  assert.equal(response.statusCode, 429);
  assert.deepEqual(response.body, {
    message: 'Please wait a minute before requesting another code.'
  });
  assert.equal(user.otp, previousOtp);
  assert.equal(sentEmails.length, 0);
});

test('unexpired pending registration is rejected and retained', async () => {
  const pendingUser = makeUser();

  const response = await submitRegister();

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'Email already exists. Please log in.');
  assert.equal(deleteOneCalls, 0);
  assert.equal(users.get(String(pendingUser._id)), pendingUser);
  assert.equal(saveCalls, 0);
});

test('verified existing account is rejected without deletion', async () => {
  const verifiedUser = makeUser({ isVerified: true });

  const response = await submitRegister();

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'Email already exists. Please log in.');
  assert.equal(deleteOneCalls, 0);
  assert.equal(users.get(String(verifiedUser._id)), verifiedUser);
});

test('expired unverified staff account is rejected and retained', async (t) => {
  for (const role of ['admin', 'superadmin', 'department']) {
    await t.test(role, async () => {
      const staffUser = makeUser({
        role,
        otpExpires: new Date(Date.now() - 60_000)
      });

      const response = await submitRegister();

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error, 'Email already exists. Please log in.');
      assert.equal(deleteOneCalls, 0);
      assert.equal(users.get(String(staffUser._id)), staffUser);
    });
  }
});

test('getMe returns a generic error without exposing exception text', async () => {
  const sensitiveError = new Error('private database failure text');
  console.error = () => {};
  const response = makeResponse();

  await authController.getMe({
    user: { toObject: () => { throw sensitiveError; } }
  }, response.res);

  assert.equal(response.result().statusCode, 500);
  assert.deepEqual(response.result().body, { error: 'Server error' });
  assert.equal(JSON.stringify(response.result().body).includes(sensitiveError.message), false);
});

test('changePassword returns generic error without exposing exception text', async () => {
  findByIdError = new Error('private database failure text');
  console.error = () => {};
  const response = makeResponse();

  await authController.changePassword({
    body: { currentPassword: 'correct-current', newPassword: 'new-password-123' },
    user: { _id: 'user-1' }
  }, response.res);

  assert.equal(response.result().statusCode, 500);
  assert.deepEqual(response.result().body, {
    error: 'Server error',
    message: 'Server error'
  });
  assert.equal(JSON.stringify(response.result().body).includes(findByIdError.message), false);
});

test('successful OTP verification marks the account verified and issues an auth response', async () => {
  const user = makeUser();
  user.otp = '654321';
  user.otpExpires = new Date(Date.now() + 60_000);

  const response = makeResponse();
  await authController.verifyOtp({
    body: { email: user.email, otp: user.otp }
  }, response.res, (error) => {
    throw error;
  });

  assert.equal(response.result().statusCode, 200);
  assert.equal(response.result().body.token, 'access-token');
  assert.equal(user.isVerified, true);
  assert.equal(user.otp, null);
  assert.equal(user.otpExpires, null);
  assert.equal(saveCalls, 1);
});
