// src/services/email.service.ts
import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: env.SMTP_SECURE === 'true',
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendMail(opts: MailOptions): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function sendEmployeeCredentials(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: 'Your TalentHub Account Credentials',
    html: `
      <h2>Welcome to TalentHub, ${name}!</h2>
      <p>Your account has been created by the administrator. Below are your login credentials:</p>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${email}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Password:</td><td style="padding:8px;">${password}</td></tr>
      </table>
      <p>Please log in at <a href="${env.FRONTEND_URL}/login">${env.FRONTEND_URL}/login</a></p>
      <p style="color:#888;font-size:12px;">For security, please change your password after your first login.</p>
    `,
  });
}

export async function sendRecruiterAccessLink(
  email: string,
  contactName: string,
  accessToken: string,
  expiresAt: Date,
): Promise<void> {
  const link = `${env.FRONTEND_URL}/recruiter/login?token=${accessToken}`;
  await sendMail({
    to: email,
    subject: 'Your TalentHub Recruiter Access Link',
    html: `
      <h2>Hello ${contactName},</h2>
      <p>You have been granted temporary access to the TalentHub talent pool.</p>
      <p><a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Access Talent Pool</a></p>
      <p style="margin-top:16px;">This link expires on: <strong>${expiresAt.toUTCString()}</strong></p>
      <p style="color:#888;font-size:12px;">Do not share this link. It is personal to you and time-limited.</p>
    `,
  });
}

export async function sendEditRequestStatus(
  email: string,
  name: string,
  status: 'approved' | 'rejected',
  adminNote?: string,
): Promise<void> {
  const statusText = status === 'approved' ? 'Approved' : 'Rejected';
  const color = status === 'approved' ? '#16a34a' : '#dc2626';
  await sendMail({
    to: email,
    subject: `Your Profile Edit Request has been ${statusText}`,
    html: `
      <h2>Hello ${name},</h2>
      <p>Your profile edit request has been <strong style="color:${color};">${statusText}</strong>.</p>
      ${adminNote ? `<p><strong>Admin Note:</strong> ${adminNote}</p>` : ''}
      <p>Visit your profile at <a href="${env.FRONTEND_URL}/employee/profile">${env.FRONTEND_URL}/employee/profile</a></p>
    `,
  });
}
