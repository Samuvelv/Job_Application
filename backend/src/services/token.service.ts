// src/services/token.service.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db';
import { env } from '../config/env';
import type { JwtPayload } from '../middleware/authenticate';

// ── Access Token ─────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = uuidv4() + uuidv4(); // 72-char random string
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  // Parse duration like "7d" → ms
  const daysMatch = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)d$/);
  const days = daysMatch ? parseInt(daysMatch[1]) : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Revoke any existing tokens for this user (rotation)
  await db('refresh_tokens').where({ user_id: userId, revoked: false }).update({ revoked: true });

  await db('refresh_tokens').insert({
    id: uuidv4(),
    user_id: userId,
    token_hash: hash,
    expires_at: expiresAt,
    revoked: false,
  });

  return raw;
}

export async function rotateRefreshToken(
  rawToken: string,
): Promise<{ userId: string; newRaw: string } | null> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await db('refresh_tokens')
    .where({ token_hash: hash, revoked: false })
    .where('expires_at', '>', new Date())
    .first();

  if (!record) return null;

  // Revoke old token
  await db('refresh_tokens').where({ id: record.id }).update({ revoked: true });

  // Issue new token
  const newRaw = await issueRefreshToken(record.user_id);
  return { userId: record.user_id, newRaw };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await db('refresh_tokens').where({ token_hash: hash }).update({ revoked: true });
}

// ── Recruiter Access Token ────────────────────────────────────────────────────

export async function issueRecruiterAccessToken(
  recruiterId: string,
  expiresInSeconds: number,
): Promise<string> {
  const jti = uuidv4();
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const token = jwt.sign(
    { sub: recruiterId, role: 'recruiter', recruiterId, jti },
    env.JWT_SECRET,
    { expiresIn: expiresInSeconds } as jwt.SignOptions,
  );

  const tokenHash = crypto.createHash('sha256').update(jti).digest('hex');
  await db('recruiter_access_tokens').insert({
    id: uuidv4(),
    recruiter_id: recruiterId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    revoked: false,
  });

  return token;
}

export async function validateRecruiterToken(jti: string): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(jti).digest('hex');
  const record = await db('recruiter_access_tokens')
    .where({ token_hash: hash, revoked: false })
    .where('expires_at', '>', new Date())
    .first();
  return !!record;
}

export async function revokeRecruiterToken(recruiterId: string): Promise<void> {
  await db('recruiter_access_tokens')
    .where({ recruiter_id: recruiterId })
    .update({ revoked: true });
}
