/**
 * rateLimiter.js — In-Memory Rate Limiter Middleware
 * MeriSamaj — Production-Level Auth Rate Limiting
 *
 * Limits:
 * - Login:          5 attempts per IP per 15 minutes
 * - OTP Send:       3 requests per phone per 10 minutes
 * - Forgot Password: 3 requests per IP per 15 minutes
 *
 * Upgradeable: Replace `store` Map with Redis for multi-server production scaling.
 */

'use strict';

// ─── IN-MEMORY STORE ──────────────────────────────────────────────────────────
// Map<key, { count: number, resetAt: number }>
const store = new Map();

const getKey = (prefix, identifier) => `${prefix}:${identifier}`;

const isRateLimited = (key, maxAttempts, windowMs) => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= maxAttempts) {
    return true;
  }

  entry.count += 1;
  store.set(key, entry);
  return false;
};

const getRemainingSeconds = (key) => {
  const entry = store.get(key);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
};

// ─── CLEANUP: Remove expired entries every 30 minutes ─────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 30 * 60 * 1000);

// ─── MIDDLEWARE FACTORIES ─────────────────────────────────────────────────────

/**
 * Login Rate Limiter: 5 attempts per IP per 15 minutes
 */
const loginLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const key = getKey('login', ip);
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  if (isRateLimited(key, maxAttempts, windowMs)) {
    const remaining = getRemainingSeconds(key);
    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Please try again in ${Math.ceil(remaining / 60)} minute(s).`,
    });
  }

  next();
};

/**
 * OTP Send Rate Limiter: 3 requests per phone per 10 minutes
 */
const otpLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  const phone = (req.body?.phone || '').replace(/\D/g, '') || req.ip;
  const key = getKey('otp', phone);
  const maxAttempts = 3;
  const windowMs = 10 * 60 * 1000; // 10 minutes

  if (isRateLimited(key, maxAttempts, windowMs)) {
    const remaining = getRemainingSeconds(key);
    return res.status(429).json({
      success: false,
      message: `OTP request limit reached. Please wait ${Math.ceil(remaining / 60)} minute(s) before requesting again.`,
    });
  }

  next();
};

/**
 * Forgot Password Rate Limiter: 3 requests per IP per 15 minutes
 */
const forgotLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const key = getKey('forgot', ip);
  const maxAttempts = 3;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  if (isRateLimited(key, maxAttempts, windowMs)) {
    const remaining = getRemainingSeconds(key);
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${Math.ceil(remaining / 60)} minute(s).`,
    });
  }

  next();
};

module.exports = { loginLimiter, otpLimiter, forgotLimiter };
