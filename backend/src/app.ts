// src/app.ts
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRouter        from './modules/auth/auth.router';
import candidatesRouter   from './modules/candidates/candidates.router';
import recruitersRouter  from './modules/recruiters/recruiters.router';
import editRequestsRouter from './modules/edit-requests/edit-requests.router';
import auditLogsRouter   from './modules/audit-logs/audit-logs.router';
import uploadsRouter     from './modules/uploads/uploads.router';
import statsRouter      from './modules/stats/stats.router';
import masterRouter     from './modules/master/master.router';
import contactRequestsRouter from './modules/contact-requests/contact-requests.router';
import volunteersRouter      from './modules/volunteers/volunteers.router';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',          authRouter);
app.use('/api/v1/candidates',     candidatesRouter);
app.use('/api/v1/recruiters',    recruitersRouter);
app.use('/api/v1/edit-requests', editRequestsRouter);
app.use('/api/v1/audit-logs',   auditLogsRouter);
app.use('/api/v1',               uploadsRouter);   // /files/:type/:filename + /candidates/:id/files/:type
app.use('/api/v1/stats',            statsRouter);
app.use('/api/v1/master',           masterRouter);
app.use('/api/v1/contact-requests', contactRequestsRouter);
app.use('/api/v1/volunteers',       volunteersRouter);

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

export default app;
