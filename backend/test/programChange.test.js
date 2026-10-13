'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { beforeEach, test } = require('node:test');

const authControllerPath = path.resolve(__dirname, '../controllers/authController.js');
const userControllerPath = path.resolve(__dirname, '../controllers/userController.js');
const authRoutesPath = path.resolve(__dirname, '../routes/authRoutes.js');
const userRoutesPath = path.resolve(__dirname, '../routes/userRoutes.js');
const frontendProgramsPath = path.resolve(__dirname, '../../frontend/src/constants/programs.json');
const backendProgramsPath = path.resolve(__dirname, '../constants/programs.json');
const {
  PROGRAM_CHANGE_COOLDOWN_MS,
  getNextProgramChangeAt,
  updateProgram
} = require('../utils/programChange');

let currentUser;
let saveCalls;

const User = {
  findById: async () => currentUser
};

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

const routeRegistrations = {
  auth: [],
  users: []
};
let activeRegistrations;
const expressMock = {
  Router: () => ({
    get: (...args) => activeRegistrations.push({ method: 'get', args }),
    post: (...args) => activeRegistrations.push({ method: 'post', args }),
    put: (...args) => activeRegistrations.push({ method: 'put', args }),
    patch: (...args) => activeRegistrations.push({ method: 'patch', args }),
    delete: (...args) => activeRegistrations.push({ method: 'delete', args })
  })
};
const routeMocks = {
  express: expressMock,
  'express-rate-limit': () => () => {},
  '../middleware/auth': {
    verifyToken: () => {},
    requireRole: () => () => {}
  },
  '../middleware/ownership': {
    validateObjectId: () => {}
  },
  '../middleware/rateLimiters': {
    loginIpLimiter: () => {},
    loginIdentityLimiter: () => {},
    googleAuthLimiter: () => {}
  }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent && parent.filename === authControllerPath && Object.hasOwn(authMocks, request)) {
    return authMocks[request];
  }
  if (parent && parent.filename === userControllerPath && request === '../models/User') {
    return User;
  }
  if (parent && parent.filename === authRoutesPath) {
    if (request === 'express' || Object.hasOwn(routeMocks, request)) {
      return routeMocks[request];
    }
  }
  if (parent && parent.filename === userRoutesPath) {
    if (request === 'express' || Object.hasOwn(routeMocks, request)) {
      return routeMocks[request];
    }
  }
  return originalLoad.call(this, request, parent, isMain);
};

let authController;
let userController;
try {
  authController = require(authControllerPath);
  userController = require(userControllerPath);
  activeRegistrations = routeRegistrations.auth;
  require(authRoutesPath);
  activeRegistrations = routeRegistrations.users;
  require(userRoutesPath);
} finally {
  Module._load = originalLoad;
}

const updateHandlers = [
  ['auth profile handler', authController.updateProfile],
  ['user profile handler', userController.updateUserProfile]
];

beforeEach(() => {
  currentUser = {
    _id: 'user-1',
    firstName: 'Before',
    lastName: 'Name',
    program: 'BS Computer Science',
    programChangedAt: null,
    avatar: 'avatar-1',
    password: 'secret',
    otp: '123456',
    otpExpires: new Date(),
    role: 'user',
    toObject() {
      return { ...this };
    },
    async save() {
      saveCalls += 1;
      return this;
    }
  };
  saveCalls = 0;
});

const invokeHandler = async (handler, body) => {
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

  await handler({
    user: { _id: currentUser._id },
    body
  }, res);
  return { statusCode, body: responseBody };
};

for (const [handlerName, handler] of updateHandlers) {
  test(`${handlerName}: first program change is allowed and its date is returned`, async () => {
    const response = await invokeHandler(handler, { program: 'BS Information Technology' });

    assert.equal(response.statusCode, 200);
    assert.equal(currentUser.program, 'BS Information Technology');
    assert.ok(currentUser.programChangedAt instanceof Date);
    assert.equal(
      response.body.user.nextProgramChangeAt,
      getNextProgramChangeAt(currentUser.programChangedAt)
    );
    assert.equal(Object.hasOwn(response.body.user, 'programChangedAt'), false);
    assert.equal(Object.hasOwn(response.body.user, 'password'), false);
    assert.equal(Object.hasOwn(response.body.user, 'otp'), false);
    assert.equal(saveCalls, 1);
  });

  test(`${handlerName}: a second consecutive program change is rejected`, async () => {
    const firstResponse = await invokeHandler(handler, { program: 'BS Information Technology' });
    assert.equal(firstResponse.statusCode, 200);
    const changedAt = currentUser.programChangedAt;
    const nextChangeAt = firstResponse.body.user.nextProgramChangeAt;

    const secondResponse = await invokeHandler(handler, { program: 'BS Information Systems' });

    assert.equal(secondResponse.statusCode, 429);
    assert.equal(
      secondResponse.body.error,
      `You can change your program again on ${nextChangeAt}`
    );
    assert.equal(secondResponse.body.nextProgramChangeAt, nextChangeAt);
    assert.equal(currentUser.program, 'BS Information Technology');
    assert.equal(currentUser.programChangedAt, changedAt);
    assert.equal(saveCalls, 1);
  });

  test(`${handlerName}: program change after 180 days is allowed`, async () => {
    currentUser.programChangedAt = new Date(Date.now() - PROGRAM_CHANGE_COOLDOWN_MS - 1000);

    const response = await invokeHandler(handler, { program: 'BS Information Technology' });

    assert.equal(response.statusCode, 200);
    assert.equal(currentUser.program, 'BS Information Technology');
    assert.ok(currentUser.programChangedAt.getTime() > Date.now() - 1000);
    assert.equal(saveCalls, 1);
  });

  test(`${handlerName}: program change during cooldown is rejected without partial changes`, async () => {
    const changedAt = new Date(Date.now() - 1000);
    currentUser.programChangedAt = changedAt;
    const nextProgramChangeAt = new Date(changedAt.getTime() + PROGRAM_CHANGE_COOLDOWN_MS).toISOString();

    const response = await invokeHandler(handler, {
      firstName: 'Changed',
      avatar: 'avatar-2',
      program: 'BS Information Technology'
    });

    assert.equal(response.statusCode, 429);
    assert.deepEqual(response.body, {
      error: `You can change your program again on ${nextProgramChangeAt}`,
      nextProgramChangeAt
    });
    assert.equal(currentUser.program, 'BS Computer Science');
    assert.equal(currentUser.programChangedAt, changedAt);
    assert.equal(currentUser.firstName, 'Before');
    assert.equal(currentUser.avatar, 'avatar-1');
    assert.equal(saveCalls, 0);
  });

  test(`${handlerName}: name-only update during cooldown does not touch program state`, async () => {
    const changedAt = new Date(Date.now() - 1000);
    currentUser.programChangedAt = changedAt;

    const response = await invokeHandler(handler, { firstName: 'Updated' });

    assert.equal(response.statusCode, 200);
    assert.equal(currentUser.firstName, 'Updated');
    assert.equal(currentUser.program, 'BS Computer Science');
    assert.equal(currentUser.programChangedAt, changedAt);
    assert.equal(saveCalls, 1);
  });

  test(`${handlerName}: resubmitting the same program during cooldown succeeds without resetting the clock`, async () => {
    const changedAt = new Date(Date.now() - 1000);
    currentUser.programChangedAt = changedAt;

    const response = await invokeHandler(handler, { program: 'BS Computer Science' });

    assert.equal(response.statusCode, 200);
    assert.equal(currentUser.program, 'BS Computer Science');
    assert.equal(currentUser.programChangedAt, changedAt);
    assert.equal(saveCalls, 1);
  });

  test(`${handlerName}: program outside the allowed list is rejected before profile changes`, async () => {
    const response = await invokeHandler(handler, {
      firstName: 'Changed',
      program: 'Unlisted Program'
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { error: 'Invalid program' });
    assert.equal(currentUser.firstName, 'Before');
    assert.equal(currentUser.program, 'BS Computer Science');
    assert.equal(currentUser.programChangedAt, null);
    assert.equal(saveCalls, 0);
  });
}

test('the exact 180-day boundary is allowed and one millisecond under is rejected', () => {
  const now = 2_000_000_000_000;
  const atBoundary = {
    program: 'BS Computer Science',
    programChangedAt: new Date(now - PROGRAM_CHANGE_COOLDOWN_MS)
  };
  const justUnder = {
    program: 'BS Computer Science',
    programChangedAt: new Date(now - PROGRAM_CHANGE_COOLDOWN_MS + 1)
  };

  assert.equal(updateProgram(atBoundary, { program: 'BS Information Technology' }, now), null);
  assert.equal(atBoundary.programChangedAt.getTime(), now);

  const rejection = updateProgram(justUnder, { program: 'BS Information Systems' }, now);
  assert.equal(rejection.status, 429);
  assert.equal(rejection.body.nextProgramChangeAt, new Date(now + 1).toISOString());
  assert.equal(justUnder.program, 'BS Computer Science');
  assert.equal(justUnder.programChangedAt.getTime(), now - PROGRAM_CHANGE_COOLDOWN_MS + 1);
});

test('sanitized next-change date is null at and after the cooldown boundary', () => {
  const now = 2_000_000_000_000;

  assert.equal(
    getNextProgramChangeAt(new Date(now - PROGRAM_CHANGE_COOLDOWN_MS), now),
    null
  );
  assert.equal(
    getNextProgramChangeAt(new Date(now - PROGRAM_CHANGE_COOLDOWN_MS + 1), now),
    new Date(now + 1).toISOString()
  );
});

test('both profile route aliases use the cooldown-enforced handlers', () => {
  assert.equal(authController.updateUserProfile, authController.updateProfile);
  for (const method of ['put', 'patch']) {
    const authProfileRoute = routeRegistrations.auth.find(
      (route) => route.method === method && route.args[0] === '/profile'
    );
    const userProfileRoute = routeRegistrations.users.find(
      (route) => route.method === method && route.args[0] === '/profile'
    );
    assert.equal(authProfileRoute.args.at(-1), authController.updateProfile);
    assert.equal(userProfileRoute.args.at(-1), userController.updateUserProfile);
  }
});

test('backend allowed programs stay aligned with the grouped registration list', () => {
  const frontendGroups = require(frontendProgramsPath);
  const backendPrograms = require(backendProgramsPath);

  assert.deepEqual(
    backendPrograms,
    frontendGroups.flatMap(({ programs }) => programs)
  );
});
