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
// Public endpoint for UI translations (no auth required for frontend use)
// Rate limited by IP to prevent abuse
router.post(
  '/',
  translationLimiter,
  translate,
);

// ── POST /api/v1/translate/recruiter ───────────────────────────────────────────
// Protected endpoint for recruiter-specific translations (requires authentication)
// Rate limited per recruiter user ID
router.post(
  '/recruiter',
  authenticate,
  authorize('recruiter'),
  translationLimiter,
  translate,
);

export default router;
