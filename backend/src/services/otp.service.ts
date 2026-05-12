// src/services/otp.service.ts
//
// OTP abstraction layer — all OTP generation, storage, and verification logic
// lives here. When real SMS/email delivery is added later, only the
// `deliverOtp()` stub below needs to be implemented; all other logic stays.
//
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OtpIssueResult {
  /** Short-lived JWT that authorises the /verify-otp endpoint (never grants dashboard access) */
  otpToken: string;
  /** Only present in development mode — the plaintext OTP for UI display */
  devOtp?: string;
}

interface OtpTokenPayload {
  sub: string;       // user UUID
  purpose: 'otp';
}

// ── OTP token helpers ──────────────────────────────────────────────────────────

export function signOtpToken(userId: string): string {
  return jwt.sign(
    { sub: userId, purpose: 'otp' } as OtpTokenPayload,
    env.OTP_TOKEN_SECRET,
    { expiresIn: env.OTP_TOKEN_EXPIRES_IN as any },
  );
}

export function verifyOtpToken(token: string): OtpTokenPayload {
  try {
    const payload = jwt.verify(token, env.OTP_TOKEN_SECRET) as any;
    if (payload.purpose !== 'otp') throw new AppError(401, 'Invalid OTP session token');
    return payload as OtpTokenPayload;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    if (err?.name === 'TokenExpiredError') throw new AppError(401, 'OTP session expired — please log in again');
    throw new AppError(401, 'Invalid OTP session token');
  }
}

// ── OTP generation & storage ───────────────────────────────────────────────────

/** Generate a cryptographically secure 6-digit OTP string */
function generatePlainOtp(): string {
  // crypto.randomInt gives a uniform random integer in [min, max)
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

/** Invalidate all existing (un-used, not-expired) OTPs for a user */
export async function invalidateOtps(userId: string): Promise<void> {
  await db('admin_otps')
    .where({ user_id: userId, used: false })
    .update({ used: true });
}

/**
 * Generate a new OTP for an admin user, hash and persist it, return the
 * OtpIssueResult.  In development mode the plaintext OTP is also returned
 * so the UI can display it; in production it is never exposed.
 */
export async function issueOtp(userId: string): Promise<OtpIssueResult> {
  const plain    = generatePlainOtp();
  const hash     = await bcrypt.hash(plain, 10);
  const minutes  = Number(env.OTP_EXPIRES_MINUTES) || 5;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  // Invalidate any previous un-used OTPs first
  await invalidateOtps(userId);

  await db('admin_otps').insert({
    user_id:    userId,
    otp_hash:   hash,
    expires_at: expiresAt,
    attempts:   0,
    used:       false,
  });

  const otpToken = signOtpToken(userId);

  // ── Future delivery hook ────────────────────────────────────────────────────
  // When a real SMS / email / WhatsApp provider is integrated, call it here:
  //
  //   await deliverOtp(userId, plain);
  //
  // For now we skip delivery entirely and rely on the devOtp in the response.
  // ───────────────────────────────────────────────────────────────────────────

  return {
    otpToken,
    devOtp: env.NODE_ENV === 'development' ? plain : undefined,
  };
}

// ── OTP verification ───────────────────────────────────────────────────────────

export interface OtpVerifyResult {
  valid: boolean;
  attemptsRemaining: number;
  locked: boolean;
}

export async function verifyOtp(userId: string, plain: string): Promise<OtpVerifyResult> {
  const maxAttempts = Number(env.OTP_MAX_ATTEMPTS) || 5;

  // Find the latest non-used, non-expired OTP for this user
  const row = await db('admin_otps')
    .where({ user_id: userId, used: false })
    .where('expires_at', '>', new Date())
    .orderBy('created_at', 'desc')
    .first();

  if (!row) {
    // No valid OTP found (expired or never issued)
    throw new AppError(401, 'OTP has expired — please request a new code');
  }

  // Check if already locked out
  if (row.attempts >= maxAttempts) {
    await invalidateOtps(userId);
    return { valid: false, attemptsRemaining: 0, locked: true };
  }

  const match = await bcrypt.compare(plain, row.otp_hash);

  if (!match) {
    const newAttempts = row.attempts + 1;
    await db('admin_otps').where({ id: row.id }).update({ attempts: newAttempts });
    const remaining = maxAttempts - newAttempts;
    if (remaining <= 0) {
      await invalidateOtps(userId);
      return { valid: false, attemptsRemaining: 0, locked: true };
    }
    return { valid: false, attemptsRemaining: remaining, locked: false };
  }

  // Correct OTP — mark as used
  await db('admin_otps').where({ id: row.id }).update({ used: true });
  return { valid: true, attemptsRemaining: maxAttempts, locked: false };
}
