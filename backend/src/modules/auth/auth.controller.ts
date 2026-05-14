// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as geoip from 'geoip-lite';
import * as authService from './auth.service';
import { logAudit } from '../../services/audit.service';
import { sendNewIpLoginAlert } from '../../services/email.service';
import {
  issueOtp,
  verifyOtp as verifyOtpService,
  verifyOtpToken,
  signOtpToken,
  invalidateOtps,
} from '../../services/otp.service';
import { db } from '../../config/db';
import { env } from '../../config/env';

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const verifyOtpSchema = z.object({
  otpToken: z.string().min(1),
  otp:      z.string().length(6).regex(/^\d{6}$/),
});

const resendOtpSchema = z.object({
  otpToken: z.string().min(1),
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

  let os = 'Unknown';
  if (/android/i.test(ua))               os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/windows nt/i.test(ua))        os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua))             os = 'Linux';
  else if (/cros/i.test(ua))              os = 'ChromeOS';

  let browser = 'Unknown';
  if (/edg\//i.test(ua))                  browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua))    browser = 'Samsung Browser';
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
function formatSessionDuration(iatSeconds: number | undefined): number | null {
  if (!iatSeconds) return null;
  return Math.max(1, Math.round((Date.now() / 1000 - iatSeconds) / 60));
}

// ── Helper: run new-IP detection for admin accounts (fire-and-forget) ────────
function triggerNewIpCheck(
  adminId: string,
  currentIp: string,
  browser: string,
  os: string,
  userEmail: string,
  userName: string,
): void {
  db('audit_logs')
    .where({ user_id: adminId, action: 'LOGIN', ip_address: currentIp })
    .count('* as count')
    .first()
    .then(async (row) => {
      const count = Number((row as any)?.count ?? 0);
      if (count <= 1) {
        const geo      = geoip.lookup(currentIp);
        const location = geo
          ? [geo.city, geo.country].filter(Boolean).join(', ') || 'Unknown'
          : 'Unknown';

        await logAudit({
          userId:    adminId,
          action:    'NEW_IP_LOGIN_DETECTED',
          resource:  'auth',
          ipAddress: currentIp,
          metadata:  { browser, os, location },
        });

        await sendNewIpLoginAlert({
          adminName:  userName,
          adminEmail: userEmail,
          ipAddress:  currentIp,
          location,
          browser,
          os,
          time: new Date().toISOString(),
        });
      }
    })
    .catch((err: unknown) => console.error('[security-alert] new-IP check failed:', err));
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body   = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    const { browser, os } = parseUserAgent(req.headers['user-agent']);

    // ── Admin → 2FA required ─────────────────────────────────────────────────
    if (result.user.role === 'admin') {
      const adminId = result.user.id as string;

      // Issue OTP (hashed, stored in admin_otps; plaintext returned in dev mode only)
      const { otpToken, devOtp } = await issueOtp(adminId);

      await logAudit({
        userId:    adminId,
        action:    'OTP_GENERATED',
        resource:  'auth',
        ipAddress: req.ip,
        metadata:  { browser, os },
      });

      // Return partial-login indicator — NO accessToken, NO refreshToken cookie yet
      res.json({
        requiresOtp: true,
        otpToken,
        ...(devOtp !== undefined ? { devOtp } : {}),
        expiresInSeconds: (Number(env.OTP_EXPIRES_MINUTES) || 5) * 60,
      });
      return;
    }

    // ── Non-admin → complete login immediately (existing flow) ───────────────
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    await logAudit({
      userId:    result.user.id as string,
      action:    'LOGIN',
      resource:  'auth',
      ipAddress: req.ip,
      metadata:  { browser, os },
    });

    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/verify-otp ─────────────────────────────────────────────────────
export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body    = verifyOtpSchema.parse(req.body);
    const payload = verifyOtpToken(body.otpToken);
    const userId  = payload.sub;

    const { browser, os } = parseUserAgent(req.headers['user-agent']);

    // Verify OTP
    const result = await verifyOtpService(userId, body.otp);

    if (result.locked) {
      await logAudit({
        userId,
        action:    'OTP_LOCKED',
        resource:  'auth',
        ipAddress: req.ip,
        metadata:  { browser, os },
      });
      res.status(429).json({
        message: 'Too many incorrect attempts. Please log in again to request a new code.',
        locked:  true,
      });
      return;
    }

    if (!result.valid) {
      await logAudit({
        userId,
        action:    'OTP_FAILED',
        resource:  'auth',
        ipAddress: req.ip,
        metadata:  { browser, os, attemptsRemaining: result.attemptsRemaining },
      });
      res.status(401).json({
        message: `Incorrect code. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining: result.attemptsRemaining,
      });
      return;
    }

    // ── OTP correct — complete the login ─────────────────────────────────────
    // Re-fetch the user to build the full session
    const user = await authService.getMe(userId);

    const { signAccessToken, issueRefreshToken } = await import('../../services/token.service');
    const accessToken   = signAccessToken({ sub: userId, role: user.role as string });
    const refreshToken  = await issueRefreshToken(userId);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    await logAudit({
      userId,
      action:    'LOGIN',
      resource:  'auth',
      ipAddress: req.ip,
      metadata:  { browser, os, via: '2fa' },
    });

    await logAudit({
      userId,
      action:    'OTP_VERIFIED',
      resource:  'auth',
      ipAddress: req.ip,
      metadata:  { browser, os },
    });

    // Fire-and-forget new-IP detection
    triggerNewIpCheck(
      userId,
      req.ip ?? 'Unknown',
      browser,
      os,
      (user as any).email ?? '',
      (user as any).name  ?? (user as any).email ?? '',
    );

    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/resend-otp ─────────────────────────────────────────────────────
export async function resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body    = resendOtpSchema.parse(req.body);
    const payload = verifyOtpToken(body.otpToken);
    const userId  = payload.sub;

    const { browser, os } = parseUserAgent(req.headers['user-agent']);

    const { otpToken, devOtp } = await issueOtp(userId); // invalidates old OTPs internally

    await logAudit({
      userId,
      action:    'OTP_RESENT',
      resource:  'auth',
      ipAddress: req.ip,
      metadata:  { browser, os },
    });

    res.json({
      otpToken,
      ...(devOtp !== undefined ? { devOtp } : {}),
      expiresInSeconds: (Number(env.OTP_EXPIRES_MINUTES) || 5) * 60,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/refresh ────────────────────────────────────────────────────────
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

// ── POST /auth/logout ─────────────────────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies?.refreshToken;
    if (raw) await authService.logout(raw);
    res.clearCookie('refreshToken');

    const sessionDuration = formatSessionDuration(req.user?.iat);
    await logAudit({
      userId:    req.user?.sub,
      action:    'LOGOUT',
      resource:  'auth',
      ipAddress: req.ip,
      metadata:  { session_duration_minutes: sessionDuration },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
