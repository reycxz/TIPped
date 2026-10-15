'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { beforeEach, test } = require('node:test');

const authControllerPath = path.resolve(__dirname, '../controllers/authController.js');
let currentUser;
let tokenSignCalls;

const User = {
  findOne: () => ({
    select: async () => currentUser
  }),
  findOneAndUpdate: (filter, update) => ({
    select() {
      return this;
    },
    lean: async () => {
      currentUser.failedLoginAttempts = (currentUser.failedLoginAttempts || 0) + update.$inc.failedLoginAttempts;
      return { failedLoginAttempts: currentUser.failedLoginAttempts };
    }
  }),
  updateOne: async (filter, update) => {
    Object.assign(currentUser, update.$set || {});
    for (const field of Object.keys(update.$unset || {})) {
      delete currentUser[field];
    }
    return { acknowledged: true };
  }
};

const mocks = {
  '../models/User': User,
  bcrypt: {
    hashSync: () => 'dummy-hash',
    compare: async (plain, hashed) => hashed !== 'dummy-hash' && plain === hashed
  },
  jsonwebtoken: {
    sign: () => {
      tokenSignCalls += 1;
      return 'test-token';
    }
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

beforeEach(() => {
  currentUser = {
    _id: 'user-1',
    email: 'student@tip.edu.ph',
    password: 'correct-password',
    role: 'user',
    authProvider: 'local',
    isVerified: true,
    hasAcceptedPrivacyPolicy: true,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastFailedLoginAt: null
  };
  tokenSignCalls = 0;
});

const submitLogin = async () => {
  let statusCode;
  let body;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    }
  };

  await authController.login({
    body: { email: currentUser.email, password: 'correct-password' },
    ip: '127.0.0.1',
    headers: {}
  }, res, (error) => {
    throw error;
  });

  return { statusCode, body };
};

test('does not issue a token to an unverified local account with a correct password', async () => {
  currentUser.isVerified = false;

  const response = await submitLogin();

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    message: 'Please verify your email first'
  });
  assert.equal(tokenSignCalls, 0);
  assert.equal(currentUser.failedLoginAttempts, 0);
});

test('fails closed when an existing local account has no verification flag', async () => {
  delete currentUser.isVerified;

  const response = await submitLogin();

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    message: 'Please verify your email first'
  });
  assert.equal(tokenSignCalls, 0);
});

test('still issues a token to a verified local account with a correct password', async () => {
  const response = await submitLogin();

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.token, 'test-token');
  assert.equal(tokenSignCalls, 1);
  assert.equal(currentUser.failedLoginAttempts, 0);
});
