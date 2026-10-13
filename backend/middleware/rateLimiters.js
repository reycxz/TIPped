'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const intFromEnv = (name, fallback, min, max) => {
  const value = parseInt(process.env[name], 10);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

const commonOptions = {
  standardHeaders: 'draft-7',
  legacyHeaders: false
};

const ipKey = (req) => ipKeyGenerator(req.ip || 'unknown');
const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase().slice(0, 254) : '';
const loginIdentityKey = (req) =>
  `${ipKey(req)}|${normalizeEmail(req.body && req.body.email)}`;

const apiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: intFromEnv('API_RATE_LIMIT_MAX', 1500, 100, 100000),
  keyGenerator: ipKey,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
  message: { error: 'Too many API requests, please try again later.' }
});

const loginIpLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: intFromEnv('LOGIN_IP_LIMIT', 100, 10, 10000),
  keyGenerator: ipKey,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts from this IP, please try again later.' }
});

const loginIdentityLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: loginIdentityKey,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts for this account, please try again later.' }
});

const googleAuthLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: ipKey,
  message: { error: 'Too many Google authentication attempts, please try again later.' }
});

const guestTicketLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: intFromEnv('GUEST_TICKET_LIMIT', 20, 1, 1000),
  keyGenerator: ipKey,
  message: { error: 'Too many guest report submissions from this IP, please try again later.' }
});

const ticketCreateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user && req.user._id ? `user:${String(req.user._id)}` : ipKey(req),
  message: { error: 'Too many ticket submissions, please try again later.' }
});

module.exports = {
  apiLimiter,
  loginIpLimiter,
  loginIdentityLimiter,
  googleAuthLimiter,
  guestTicketLimiter,
  ticketCreateLimiter,
  loginIdentityKey
};
