// src/types/express.d.ts
declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      role: string;
      recruiterId?: string;
      jti?: string;
      iat?: number;
      exp?: number;
    };
  }
}
