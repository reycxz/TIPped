'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

const User = require('../models/User');
const { PROGRAM_CHANGE_COOLDOWN_MS } = require('../utils/programChange');
const authControllerPath = path.resolve(__dirname, '../controllers/authController.js');
let currentUser;
let saveCalls;

const authMocks = {
  '../models/User': User,
  '../models/Department': {},
  '../models/Category': {},
  '../utils/departmentAccountSync': {
    getDepartmentCategoryNames: async () => [],
    findDepartmentAccounts: async () => []
  },
  '../utils/loginLockout': {
    createLoginGuard: () => ({
      attempt: async () => ({ allowed: true }),
      fail: async () => ({}),
      succeed: async () => {}
    }),
    createMongooseStore: () => ({})
  },
  '../utils/googleAudience': {
    verifyGoogleAudience: async () => ({ ok: true, notConfigured: false })
  },
  bcrypt: {
    hashSync: () => 'test-hash',
    compare: async () => true
  },
  jsonwebtoken: {
    sign: () => 'test-token'
  },
  nodemailer: {
    createTransport: () => ({ sendMail: async () => {} })
  }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent && parent.filename === authControllerPath && Object.hasOwn(authMocks, request)) {
    return authMocks[request];
  }
  return originalLoad.call(this, request, parent, isMain);
};

let authController;
try {
  authController = require(authControllerPath);
} finally {
  Module._load = originalLoad;
}

const originalFindById = User.findById;

const submitProgram = async (program) => {
  let statusCode;
  let responseBody;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      responseBody = payload;
      return this;
    }
  };

  await authController.updateProfile({
    user: { _id: currentUser._id },
    body: { program }
  }, res);

  return { statusCode, body: responseBody };
};

test('real User schema and auth profile handler persist and enforce the program cooldown', async (t) => {
  assert.equal(User.schema.path('programChangedAt').instance, 'Date');

  currentUser = new User({
    firstName: 'Test',
    lastName: 'Student',
    email: 'cooldown-test@tip.edu.ph',
    program: 'BS Computer Science',
    role: 'user',
    isVerified: true,
    hasAcceptedPrivacyPolicy: true
  });

  const originalSave = currentUser.save;
  currentUser.save = async function () {
    saveCalls += 1;
    return this;
  };
  saveCalls = 0;
  User.findById = async () => currentUser;

  t.after(() => {
    User.findById = originalFindById;
    currentUser.save = originalSave;
  });

  const firstResponse = await submitProgram('BS Mechanical Engineering');

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(currentUser.program, 'BS Mechanical Engineering');
  assert.ok(currentUser.programChangedAt instanceof Date);
  assert.equal(saveCalls, 1);
  assert.equal(
    typeof firstResponse.body.user.nextProgramChangeAt,
    'string'
  );
  assert.equal(
    new Date(firstResponse.body.user.nextProgramChangeAt).getTime(),
    currentUser.programChangedAt.getTime() + PROGRAM_CHANGE_COOLDOWN_MS
  );
  assert.equal(Object.hasOwn(firstResponse.body.user, 'programChangedAt'), false);

  const secondResponse = await submitProgram('BS Civil Engineering');

  assert.equal(secondResponse.statusCode, 429);
  assert.equal(secondResponse.body.nextProgramChangeAt, firstResponse.body.user.nextProgramChangeAt);
  assert.equal(currentUser.program, 'BS Mechanical Engineering');
  assert.equal(saveCalls, 1);
});
