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

/**
 * Returns true when the supplied identifier is a Candidate Login ID —
 * i.e. it is a purely numeric string (e.g. "10001").
 * Email addresses always contain "@" so they will never match this.
 */
function isCandidateLoginId(identifier: string): boolean {
  return /^\d+$/.test(identifier.trim());
}

export async function login(
  email: string,   // field name kept as "email" for API backward-compat;
                   // value may be an email address OR a numeric Candidate Login ID
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {

  let user: Record<string, unknown> | undefined;

  if (isCandidateLoginId(email)) {
    // ── Candidate Login ID path ──────────────────────────────────────────────
    // Look up the candidate by their numeric login_id, then join to users/roles.
    const loginId = parseInt(email.trim(), 10);

    user = await db('candidates as c')
      .join('users as u', 'u.id', 'c.user_id')
      .join('roles as r', 'r.id', 'u.role_id')
      .where('c.login_id', loginId)
      .select(
        'u.id',
        'u.email',
        'u.password_hash',
        'u.is_active',
        'r.name as role',
        'c.first_name',
      )
      .first();

    if (!user) throw new AppError(401, 'Invalid Candidate ID or password');

    // Safety: only candidates may authenticate via numeric ID
    if (user.role !== 'candidate') {
      throw new AppError(401, 'Invalid Candidate ID or password');
    }

    if (!user.is_active) throw new AppError(403, 'Account is deactivated');

    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) throw new AppError(401, 'Invalid Candidate ID or password');

  } else {
    // ── Email path (admin / recruiter / candidate by email) ─────────────────
    user = await db('users as u')
      .join('roles as r', 'r.id', 'u.role_id')
      .leftJoin('admins as a', 'a.user_id', 'u.id')
      .where('u.email', email.toLowerCase().trim())
      .select('u.id', 'u.email', 'u.password_hash', 'u.is_active', 'r.name as role', 'a.first_name')
      .first();

    if (!user) throw new AppError(401, 'Invalid email or password');
    if (!user.is_active) throw new AppError(403, 'Account is deactivated');

    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    // Candidates must authenticate via their numeric Login ID, not email.
    // If a candidate account is found on the email path, block it with a
    // clear, instructional message rather than a generic "not found" error.
    if (user.role === 'candidate') {
      throw new AppError(
        401,
        'Candidates must sign in using their Candidate Login ID, not an email address. Please use your numeric Login ID (e.g. 10001) and password.',
      );
    }

    // For recruiters, check access expiry at login time
    if (user.role === 'recruiter') {
      const recruiter = await db('recruiters').where({ user_id: user.id }).select('access_expires_at').first();
      const expiry = recruiter?.access_expires_at ? new Date(recruiter.access_expires_at) : null;
      if (expiry && !isNaN(expiry.getTime()) && expiry < new Date()) {
        throw new AppError(403, 'Your access has expired. Please contact the administrator.');
      }
    }
  }

  // For recruiters, embed account-level access_expires_at into the JWT so that
  // the authenticate middleware can enforce expiry on every request without a DB hit.
  let recruiterAccessExpiresAt: string | undefined;
  if (user.role === 'recruiter') {
    const rec = await db('recruiters').where({ user_id: user.id }).select('access_expires_at').first();
    if (rec?.access_expires_at) {
      const d = new Date(rec.access_expires_at);
      if (!isNaN(d.getTime())) recruiterAccessExpiresAt = d.toISOString();
    }
  }

  const accessToken = signAccessToken({
    sub: user.id as string,
    role: user.role as string,
    ...(recruiterAccessExpiresAt ? { accessExpiresAt: recruiterAccessExpiresAt } : {}),
  });
  const refreshToken = await issueRefreshToken(user.id as string);

  return {
    accessToken,
    refreshToken,
    user: {
      id:   user.id,
      email: user.email,
      role:  user.role,
      name:  (user.first_name as string | null) ?? null,
    },
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

  // Re-embed recruiter access expiry so the per-request gate stays active after refresh
  let recruiterAccessExpiresAt: string | undefined;
  if (user.role === 'recruiter') {
    const rec = await db('recruiters').where({ user_id: user.id }).select('access_expires_at').first();
    if (rec?.access_expires_at) {
      const d = new Date(rec.access_expires_at);
      if (!isNaN(d.getTime())) recruiterAccessExpiresAt = d.toISOString();
    }
  }

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    ...(recruiterAccessExpiresAt ? { accessExpiresAt: recruiterAccessExpiresAt } : {}),
  });
  return { accessToken, refreshToken: result.newRaw };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  await revokeRefreshToken(rawRefreshToken);
}

export async function getMe(userId: string): Promise<Record<string, unknown>> {
  const user = await db('users as u')
    .join('roles as r', 'r.id', 'u.role_id')
    .leftJoin('admins as a', 'a.user_id', 'u.id')
    .where('u.id', userId)
    .select('u.id', 'u.email', 'u.is_active', 'r.name as role', 'u.created_at', 'a.first_name')
    .first();

  if (!user) throw new AppError(404, 'User not found');
  return { ...user, name: user.first_name ?? null };
}
