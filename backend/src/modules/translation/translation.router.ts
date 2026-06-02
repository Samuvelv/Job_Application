// src/modules/translation/translation.router.ts
import { Router }     from 'express';
import rateLimit      from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import { translate }    from './translation.controller';

// ── Per-recruiter rate limiter ────────────────────────────────────────────────
// Keyed by authenticated user ID (set on req after authenticate runs) so that
// multiple recruiters sharing an office IP are each limited independently.
const translationLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 10,               // max 10 translation requests per recruiter per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
  message: { message: 'Too many translation requests. Please wait a moment before translating again.' },
});

const router = Router();

// ── POST /api/v1/translate ────────────────────────────────────────────────────
// 1. authenticate  — rejects unauthenticated requests (no valid JWT)
// 2. authorize     — rejects non-recruiter roles (admin, candidate, etc.)
// 3. translationLimiter — caps cost abuse at 10 req/min per recruiter
// 4. translate     — calls OpenAI and returns translated fields
router.post(
  '/',
  authenticate,
  authorize('recruiter'),
  translationLimiter,
  translate,
);

export default router;
