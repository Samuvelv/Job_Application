// src/services/email.service.ts
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

// ── Transporter ──────────────────────────────────────────────────────────────
// If real SMTP credentials are provided in .env, use them.
// Otherwise, auto-create a free Ethereal test account on first use.
// Ethereal emails are never delivered; preview them at the URL printed to console.

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    // Real SMTP config provided
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT ?? '587'),
      secure: env.SMTP_SECURE === 'true',
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    console.log(`📧  Email: using real SMTP (${env.SMTP_HOST})`);
  } else {
    // No credentials → create a free Ethereal catch-all inbox
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧  Email: using Ethereal test account');
    console.log(`    Inbox preview → https://ethereal.email/messages`);
    console.log(`    Login: ${testAccount.user} / ${testAccount.pass}`);
  }

  return _transporter;
}

// ── Internal send helper ─────────────────────────────────────────────────────
interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendMail(opts: MailOptions): Promise<void> {
  const transport = await getTransporter();
  const from = env.EMAIL_FROM ?? 'TalentHub <noreply@talenthub.local>';

  const info = await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  // For Ethereal, log the preview URL so you can inspect the email immediately
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📨  Email sent → Preview: ${previewUrl}`);
  }
}

// ── Public send functions ────────────────────────────────────────────────────

export async function sendCandidateCredentials(
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

export async function sendRecruiterCredentials(
  email: string,
  contactName: string,
  password: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: 'Your TalentHub Recruiter Account Credentials',
    html: `
      <h2>Welcome to TalentHub, ${contactName}!</h2>
      <p>Your recruiter account has been created by the administrator. Below are your login credentials:</p>
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
      <p>Visit your profile at <a href="${env.FRONTEND_URL}/candidate/profile">${env.FRONTEND_URL}/candidate/profile</a></p>
    `,
  });
}
