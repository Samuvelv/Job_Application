// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = uuidv4();
  res.setHeader('X-Request-ID', requestId);

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation error',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.code && { code: err.code }),
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({ message: err.message });
    return;
  }

  // Unknown errors — hide details in production
  console.error(`[ERROR] requestId=${requestId}`, err);
  res.status(500).json({
    message: 'Internal server error',
    requestId,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
