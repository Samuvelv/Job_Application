// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { logAudit } from '../../services/audit.service';
import { env } from '../../config/env';

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ── User-agent parser (no external dependency) ────────────────────────────────
function parseUserAgent(ua: string | undefined): { browser: string; os: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown' };

  // OS detection
  let os = 'Unknown';
  if (/android/i.test(ua))        os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua))      os = 'Linux';
  else if (/cros/i.test(ua))       os = 'ChromeOS';

  // Browser detection (order matters — more specific first)
  let browser = 'Unknown';
  if (/edg\//i.test(ua))           browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Browser';
  else if (/chrome\/[\d.]+/i.test(ua) && !/chromium/i.test(ua)) {
    browser = /mobile/i.test(ua) ? 'Mobile Chrome' : 'Chrome';
  }
  else if (/firefox\/[\d.]+/i.test(ua)) {
    browser = /mobile/i.test(ua) ? 'Mobile Firefox' : 'Firefox';
  }
  else if (/safari\/[\d.]+/i.test(ua)) {
    browser = /mobile/i.test(ua) ? 'Mobile Safari' : 'Safari';
  }

  return { browser, os };
}

// ── Session duration formatter ────────────────────────────────────────────────
function formatSessionDuration(iatSeconds: number | undefined): string {
  if (!iatSeconds) return 'Unknown';
  const minutes = Math.round((Date.now() / 1000 - iatSeconds) / 60);
  if (minutes < 1)   return 'Less than 1 minute';
  if (minutes < 60)  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rem   = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours} hour${hours === 1 ? '' : 's'}`;
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);

    // Refresh token in httpOnly cookie; access token in response body
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    const { browser, os } = parseUserAgent(req.headers['user-agent']);
    await logAudit({
      userId: result.user.id as string,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: req.ip,
      metadata: { browser, os },
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies?.refreshToken;
    if (!raw) {
      res.status(401).json({ message: 'No refresh token' });
      return;
    }
    const tokens = await authService.refreshTokens(raw);
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies?.refreshToken;
    if (raw) await authService.logout(raw);
    res.clearCookie('refreshToken');

    const sessionDuration = formatSessionDuration(req.user?.iat);
    await logAudit({
      userId: req.user?.sub,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: req.ip,
      metadata: { session_duration: sessionDuration },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
