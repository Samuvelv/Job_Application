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
  const isApproved = status === 'approved';
  
  let html = `
    <h2>Hello ${name},</h2>
  `;

  if (isApproved) {
    html += `
      <p>Your profile update request has been <strong style="color:#16a34a;">approved</strong>.</p>
      <p style="font-size:16px;line-height:1.6;color:#111827;">Your profile has been updated with the changes you requested.</p>
    `;
  } else {
    html += `
      <p>Your profile update request has been <strong style="color:#dc2626;">reviewed</strong>.</p>
      <p style="font-size:16px;line-height:1.6;color:#111827;">Please contact our team for more information.</p>
      ${adminNote ? `<p style="background:#fef3c7;padding:12px;border-left:4px solid #f59e0b;border-radius:4px;"><strong>Note from Admin:</strong><br/>${adminNote}</p>` : ''}
    `;
  }

  html += `
    <p style="margin-top:24px;">
      <a href="${env.FRONTEND_URL}/candidate/profile" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        View Your Profile
      </a>
    </p>
    <p style="color:#888;font-size:12px;margin-top:20px;">If you have any questions, please reach out to our support team.</p>
  `;

  const subject = isApproved 
    ? '✅ Your Profile Update Request Has Been Approved'
    : '📋 Your Profile Update Request Has Been Reviewed';

  await sendMail({
    to: email,
    subject,
    html,
  });
}

export async function sendAdminEditRequestNotification(
  candidateName: string,
  candidateEmail: string,
): Promise<void> {
  if (!env.ADMIN_EMAIL) {
    console.warn('⚠️  ADMIN_EMAIL not configured, skipping admin notification');
    return;
  }

  await sendMail({
    to: env.ADMIN_EMAIL,
    subject: '📝 New Profile Edit Request Received',
    html: `
      <h2>New Profile Edit Request</h2>
      <p>A candidate has submitted a new profile edit request.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;font-weight:bold;">Candidate:</td><td style="padding:8px;">${candidateName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${candidateEmail}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Time:</td><td style="padding:8px;">${new Date().toUTCString()}</td></tr>
      </table>
      <p><a href="${env.FRONTEND_URL}/admin/edit-requests" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Review Requests</a></p>
    `,
  });
}

export async function sendAdminContactRequestNotification(
  recruiterName: string,
  recruiterEmail: string,
): Promise<void> {
  if (!env.ADMIN_EMAIL) {
    console.warn('⚠️  ADMIN_EMAIL not configured, skipping admin notification');
    return;
  }

  await sendMail({
    to: env.ADMIN_EMAIL,
    subject: '💬 New Contact Request Received',
    html: `
      <h2>New Contact Request</h2>
      <p>A recruiter has submitted a new contact request.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;font-weight:bold;">Recruiter:</td><td style="padding:8px;">${recruiterName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${recruiterEmail}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Time:</td><td style="padding:8px;">${new Date().toUTCString()}</td></tr>
      </table>
      <p><a href="${env.FRONTEND_URL}/admin/contact-submissions" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Review Submissions</a></p>
    `,
  });
}
