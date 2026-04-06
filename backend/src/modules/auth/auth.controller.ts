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

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);

    // Refresh token in httpOnly cookie; access token in response body
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    await logAudit({
      userId: result.user.id as string,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: req.ip,
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

    await logAudit({
      userId: req.user?.sub,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: req.ip,
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
