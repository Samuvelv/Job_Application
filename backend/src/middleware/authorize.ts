// src/middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Role-based access control middleware.
 * Usage: router.get('/path', authenticate, authorize('admin'), handler)
 */
export const authorize = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
