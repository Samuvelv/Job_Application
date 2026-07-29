// src/modules/translation/translation.router.ts
import { Router }     from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import { translate }    from './translation.controller';

// ── Per-recruiter rate limiter ────────────────────────────────────────────────
// Keyed by authenticated user ID (set on req after authenticate runs) so that
// multiple recruiters sharing an office IP are each limited independently.
// Falls back to IPv6-aware IP-based limiting when user is not authenticated.
const translationLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 10,               // max 10 translation requests per recruiter per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IPv6-aware IP detection
    if (req.user?.sub) {
      return req.user.sub;
    }
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  message: { message: 'Too many translation requests. Please wait a moment before translating again.' },
});

const router = Router();

// ── POST /api/v1/translate ────────────────────────────────────────────────────
// Requires authentication — this endpoint calls a paid OpenAI API, so it must
// not be reachable by unauthenticated callers. Available to any logged-in
// admin, recruiter, or candidate viewing/translating profile data.
// Rate limited per user ID.
router.post(
  '/',
  authenticate,
  authorize('admin', 'recruiter', 'candidate'),
  translationLimiter,
  translate,
);

// ── POST /api/v1/translate/recruiter ───────────────────────────────────────────
// Alias kept for backward compatibility with any existing recruiter-specific callers.
router.post(
  '/recruiter',
  authenticate,
  authorize('admin', 'recruiter', 'candidate'),
  translationLimiter,
  translate,
);

export default router;
