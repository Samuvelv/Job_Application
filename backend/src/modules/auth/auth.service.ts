// src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../../services/token.service';

export async function login(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
  const user = await db('users as u')
    .join('roles as r', 'r.id', 'u.role_id')
    .where('u.email', email.toLowerCase().trim())
    .select('u.id', 'u.email', 'u.password_hash', 'u.is_active', 'r.name as role')
    .first();

  if (!user) throw new AppError(401, 'Invalid email or password');
  if (!user.is_active) throw new AppError(403, 'Account is deactivated');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export async function refreshTokens(
  rawRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const result = await rotateRefreshToken(rawRefreshToken);
  if (!result) throw new AppError(401, 'Invalid or expired refresh token', 'TOKEN_EXPIRED');

  const user = await db('users as u')
    .join('roles as r', 'r.id', 'u.role_id')
    .where('u.id', result.userId)
    .select('u.id', 'r.name as role')
    .first();

  if (!user) throw new AppError(401, 'User not found');

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  return { accessToken, refreshToken: result.newRaw };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  await revokeRefreshToken(rawRefreshToken);
}

export async function getMe(userId: string): Promise<Record<string, unknown>> {
  const user = await db('users as u')
    .join('roles as r', 'r.id', 'u.role_id')
    .where('u.id', userId)
    .select('u.id', 'u.email', 'u.is_active', 'r.name as role', 'u.created_at')
    .first();

  if (!user) throw new AppError(404, 'User not found');
  return user;
}
