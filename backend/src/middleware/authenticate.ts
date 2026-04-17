// src/middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;        // user UUID
  role: string;       // admin | candidate | recruiter
  recruiterId?: string;
  jti?: string;       // JWT ID — used for recruiter token revocation
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
