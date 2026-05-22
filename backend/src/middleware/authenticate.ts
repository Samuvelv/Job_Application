// src/middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;        // user UUID
  role: string;       // admin | candidate | recruiter
  recruiterId?: string;
  jti?: string;       // JWT ID — used for recruiter token revocation
  accessExpiresAt?: string; // ISO timestamp — recruiter account-level expiry embedded at login
  iat?: number;
  exp?: number;
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token missing' });
    return;
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // For recruiter tokens: enforce account-level access expiry on every request.
    // The access_expires_at is embedded into the JWT at login time so no DB hit is needed here.
    if (payload.role === 'recruiter' && payload.accessExpiresAt) {
      const expiry = new Date(payload.accessExpiresAt);
      if (!isNaN(expiry.getTime()) && expiry <= new Date()) {
        res.status(403).json({ message: 'Your access has expired. Please contact the administrator.' });
        return;
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ message: 'Invalid token' });
    }
  }
};
