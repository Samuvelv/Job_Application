// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

/** Strict limiter for auth endpoints */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a minute.' },
});

/** General API limiter */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});
