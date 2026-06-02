// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DB_HOST: z.string(),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  // DB_PASSWORD must be set explicitly — no default is provided so a missing
  // production value causes an immediate startup failure rather than silently
  // connecting with a known-insecure fallback password.
  DB_PASSWORD: z.string(),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('2h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),

  // 2FA / OTP
  // OTP_TOKEN_SECRET must be explicitly set in every environment — no default is
  // provided so that a missing production value causes startup to fail loudly
  // instead of silently using a known-insecure fallback.
  OTP_TOKEN_SECRET: z.string().min(32),
  OTP_TOKEN_EXPIRES_IN: z.string().default('10m'),
  OTP_EXPIRES_MINUTES: z.string().default('5'),
  OTP_MAX_ATTEMPTS: z.string().default('5'),

  CORS_ORIGIN: z.string().default('http://localhost:4200'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),

  TWILIO_ACCOUNT_SID:    z.string().optional(),
  TWILIO_AUTH_TOKEN:     z.string().optional(),
  TWILIO_WHATSAPP_FROM:  z.string().optional(),

  APP_URL: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:4200'),

  // File upload storage — absolute path on the host filesystem.
  // Local dev  : ./uploads  (relative to project root, auto-resolved below)
  // VPS prod   : /var/www/ntlcareernexus/uploads
  UPLOADS_PATH: z.string().default('uploads'),

  // ── OpenAI — candidate profile translation (recruiter only) ──────────────
  // OPENAI_API_KEY must be set to enable the /api/v1/translate endpoint.
  // Leave blank to disable translation (endpoint will return 503).
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL:   z.string().default('gpt-4o-mini'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
