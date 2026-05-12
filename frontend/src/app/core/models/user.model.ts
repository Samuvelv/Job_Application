// src/app/core/models/user.model.ts
export type UserRole = 'admin' | 'candidate' | 'recruiter';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface OtpChallengeResponse {
  requiresOtp: true;
  otpToken: string;
  devOtp?: string;
  expiresInSeconds: number;
}

export type LoginResponse = AuthResponse | OtpChallengeResponse;

export interface LoginPayload {
  email: string;
  password: string;
}
