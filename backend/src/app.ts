// src/app.ts
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { UPLOADS_BASE_PATH } from './config/multer';

import authRouter                    from './modules/auth/auth.router';
import candidatesRouter              from './modules/candidates/candidates.router';
import recruitersRouter              from './modules/recruiters/recruiters.router';
import editRequestsRouter            from './modules/edit-requests/edit-requests.router';
import auditLogsRouter               from './modules/audit-logs/audit-logs.router';
import statsRouter                   from './modules/stats/stats.router';
import masterRouter                  from './modules/master/master.router';
import contactRequestsRouter         from './modules/contact-requests/contact-requests.router';
import volunteersRouter              from './modules/volunteers/volunteers.router';
import contactSubmissionsRouter      from './modules/contact-submissions/contact-submissions.router';
import volunteerSupportRouter        from './modules/volunteer-support-requests/volunteer-support-requests.router';
import uploadsRouter                 from './modules/uploads/uploads.router';
import agencyReferralsRouter         from './modules/agency-referrals/agency-referrals.router';
import agencyInterestRequestsRouter  from './modules/agency-interest-requests/agency-interest-requests.router';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
// cross-origin-resource-policy must be "cross-origin" so that browsers can
// load uploaded images/files from https://infortsolutions.in/uploads/ when
// the frontend runs on a different origin (e.g. different port or subdomain).
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:         env.CORS_ORIGIN,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Static file serving — uploaded files ─────────────────────────────────────
// Local dev : serves from <project>/uploads/  → http://localhost:3000/uploads/
// VPS prod  : serves from /var/www/ntlcareernexus/uploads/ (set via UPLOADS_PATH env)
// UPLOADS_BASE_PATH is resolved to an absolute path by multer.ts at startup.
app.use(
  '/uploads',
  express.static(UPLOADS_BASE_PATH, {
    maxAge:      '30d',
    immutable:   false,
    index:       false,   // never list directory contents
    dotfiles:    'deny',  // block hidden files
    fallthrough: true,    // pass to next middleware if file not found
  }),
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Global request log ────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log('[GLOBAL]', req.method, req.originalUrl);
  next();
});

// ── API Routes — specific mounts FIRST, generic /api/v1 mount LAST ───────────
app.use('/api/v1/auth',                              authRouter);
app.use('/api/v1/candidates',                        candidatesRouter);
app.use('/api/v1/recruiters',                        recruitersRouter);
app.use('/api/v1/edit-requests',                     editRequestsRouter);
app.use('/api/v1/audit-logs',                        auditLogsRouter);
app.use('/api/v1/stats',                             statsRouter);
app.use('/api/v1/master',                            masterRouter);
app.use('/api/v1/contact-requests',                  contactRequestsRouter);
app.use('/api/v1/volunteers',                        volunteersRouter);
app.use('/api/v1/contact-submissions',               contactSubmissionsRouter);
app.use('/api/v1/volunteer-support-requests',        volunteerSupportRouter);
app.use('/api/v1/candidates/:candidateId/referrals', agencyReferralsRouter);
app.use('/api/v1/interest-requests',                 agencyInterestRequestsRouter);
// Generic /api/v1 mount LAST — never shadows any specific router above
app.use('/api/v1',                                   uploadsRouter);

// ── Global error handler (must be last middleware) ────────────────────────────
app.use(errorHandler);

export default app;
