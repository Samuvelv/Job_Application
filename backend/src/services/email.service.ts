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
  const from = env.EMAIL_FROM ?? 'NTL Career Nexus <hello@ntlcareernexus.com>';

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

/** @deprecated Use sendCandidateWelcomeEmail instead */
export async function sendCandidateCredentials(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  return sendCandidateWelcomeEmail(email, password, name);
}

export async function sendCandidateWelcomeEmail(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: 'Welcome to NTL Career Nexus — Your Account is Under Review',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;">Welcome to NTL Career Nexus, ${name}!</h1>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;line-height:1.7;color:#111827;">
            Thank you for joining NTL Career Nexus. Your profile has been created and is currently <strong>under review</strong> by our team.
            We will be in touch once your profile has been assessed.
          </p>
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            In the meantime, you can log in to view and update your profile:
          </p>
          <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:400px;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Email</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Password</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${password}</td>
            </tr>
          </table>
          <p style="margin-top:24px;">
            <a href="${env.FRONTEND_URL}/login" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-size:15px;">
              Log In to Your Profile
            </a>
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This email was sent by the NTL Career Nexus admin team. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendCandidateCredentialsResent(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: 'Your NTL Career Nexus Login Credentials',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Your Login Credentials</h1>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;line-height:1.7;color:#111827;">
            Hi <strong>${name}</strong>, your login credentials have been resent by the NTL Career Nexus admin team.
            Use the details below to access your account.
          </p>
          <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:400px;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Email</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Password</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${password}</td>
            </tr>
          </table>
          <p style="margin-top:24px;">
            <a href="${env.FRONTEND_URL}/login" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-size:15px;">
              Log In to Your Profile
            </a>
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This email was sent by the NTL Career Nexus admin team. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendRecruiterCredentialsResent(
  email: string,
  contactName: string,
  password: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: 'Your NTL Career Nexus Recruiter Login Credentials',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Your Recruiter Login Credentials</h1>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;line-height:1.7;color:#111827;">
            Hi <strong>${contactName}</strong>, your recruiter account credentials have been resent by the NTL Career Nexus admin team.
            Use the details below to access your account.
          </p>
          <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:400px;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Email</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Password</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${password}</td>
            </tr>
          </table>
          <p style="margin-top:24px;">
            <a href="${env.FRONTEND_URL}/login" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-size:15px;">
              Log In to Your Account
            </a>
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This email was sent by the NTL Career Nexus admin team. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendAdminNewCandidateNotification(
  candidateName: string,
): Promise<void> {
  if (!env.ADMIN_EMAIL) {
    console.warn('⚠️  ADMIN_EMAIL not configured — skipping admin new-candidate notification');
    return;
  }

  await sendMail({
    to: env.ADMIN_EMAIL,
    subject: `New candidate registered — ${candidateName} — Review required`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#4f46e5;padding:24px;border-radius:12px 12px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;">New Candidate Registered</h2>
        </div>
        <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;color:#111827;">A new candidate has been registered and requires review.</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;font-weight:bold;">Candidate:</td><td style="padding:8px;">${candidateName}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Time:</td><td style="padding:8px;">${new Date().toUTCString()}</td></tr>
          </table>
          <p style="margin-top:20px;">
            <a href="${env.FRONTEND_URL}/admin/candidates" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
              Review Candidates
            </a>
          </p>
        </div>
      </div>
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
    subject: 'Your NTL Career Nexus Recruiter Account Credentials',
    html: `
      <h2>Welcome to NTL Career Nexus, ${contactName}!</h2>
      <p>Your recruiter account has been created by the administrator. Below are your login credentials:</p>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${email}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Password:</td><td style="padding:8px;">${password}</td></tr>
      </table>
      <p>Please log in at <a href="${env.FRONTEND_URL}/login">${env.FRONTEND_URL}/login</a></p>
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
    subject: 'Your NTL Career Nexus Recruiter Access Link',
    html: `
      <h2>Hello ${contactName},</h2>
      <p>You have been granted temporary access to the NTL Career Nexus talent pool.</p>
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

export async function sendAdminVolunteerSupportNotification(
  candidateName: string,
  volunteerName: string,
): Promise<void> {
  if (!env.ADMIN_EMAIL) {
    console.warn('⚠️  ADMIN_EMAIL not configured, skipping volunteer support notification');
    return;
  }

  await sendMail({
    to: env.ADMIN_EMAIL,
    subject: '🤝 New Volunteer Support Request',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#4f46e5;padding:28px 24px;border-radius:12px 12px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:22px;">🤝 New Volunteer Support Request</h2>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;line-height:1.7;color:#111827;">
            A candidate has requested to be connected with a volunteer.
          </p>
          <table style="border-collapse:collapse;margin:16px 0;width:100%;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Candidate</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${candidateName}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Volunteer</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${volunteerName}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">Time</td>
              <td style="padding:10px 14px;color:#111827;border:1px solid #e5e7eb;">${new Date().toUTCString()}</td>
            </tr>
          </table>
          <p style="font-size:14px;color:#6b7280;margin-top:16px;">
            Please review this request and connect the candidate with the volunteer through the admin panel.
          </p>
          <p style="margin-top:24px;">
            <a href="${env.FRONTEND_URL}/admin/edit-requests" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Review Support Requests</a>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendAdminContactNotification(
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

export async function sendContactRequestApprovedNotification(
  recruiterEmail: string,
  recruiterName: string,
  candidateName: string,
): Promise<void> {
  await sendMail({
    to: recruiterEmail,
    subject: '✅ Contact Request Approved',
    html: `
      <h2>Hello ${recruiterName},</h2>
      <p>Your request to contact <strong>${candidateName}</strong> has been <strong style="color:#16a34a;">approved</strong>.</p>
      <p style="font-size:16px;line-height:1.6;color:#111827;">Their contact details are now visible on their profile. You can reach out to them directly.</p>
      <p style="margin-top:24px;">
        <a href="${env.FRONTEND_URL}/recruiter/candidates" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          View Candidate Profile
        </a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:20px;">If you have any questions, please reach out to our support team.</p>
    `,
  });
}

export async function sendContactRequestRejectedNotification(
  recruiterEmail: string,
  recruiterName: string,
): Promise<void> {
  await sendMail({
    to: recruiterEmail,
    subject: '📋 Contact Request Reviewed',
    html: `
      <h2>Hello ${recruiterName},</h2>
      <p>Your contact request has been <strong style="color:#dc2626;">reviewed</strong>.</p>
      <p style="font-size:16px;line-height:1.6;color:#111827;">This candidate is not available for direct contact at this time.</p>
      <p style="margin-top:24px;">
        <a href="${env.FRONTEND_URL}/recruiter/dashboard" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Return to Dashboard
        </a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:20px;">If you have any questions, please reach out to our support team.</p>
    `,
  });
}

export async function sendInterestRequestNotification(
  recruiterName: string,
  recruiterCompany: string,
  recruiterEmail: string,
  candidateName: string,
): Promise<void> {
  if (!env.ADMIN_EMAIL) {
    console.warn('⚠️  ADMIN_EMAIL not configured, skipping interest request notification');
    return;
  }
  await sendMail({
    to: env.ADMIN_EMAIL,
    subject: '🔔 New Agency Interest Request Received',
    html: `
      <h2>New Agency Interest Request</h2>
      <p>A recruitment agency has submitted a new interest request.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;font-weight:bold;">Agency:</td><td style="padding:8px;">${recruiterCompany}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Contact:</td><td style="padding:8px;">${recruiterName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${recruiterEmail}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Candidate:</td><td style="padding:8px;">${candidateName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Time:</td><td style="padding:8px;">${new Date().toUTCString()}</td></tr>
      </table>
      <p><a href="${env.FRONTEND_URL}/admin/interest-requests" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Review Interest Requests</a></p>
    `,
  });
}

export async function sendInterestRequestReviewed(
  recruiterEmail: string,
  recruiterName: string,
  candidateName: string,
  status: 'approved' | 'rejected',
  adminNote?: string,
): Promise<void> {
  const isApproved = status === 'approved';
  const subject = isApproved
    ? '✅ Your Interest Request Has Been Approved'
    : '📋 Your Interest Request Has Been Reviewed';

  const html = `
    <h2>Hello ${recruiterName},</h2>
    ${isApproved
      ? `<p>Your interest request for <strong>${candidateName}</strong> has been <strong style="color:#16a34a;">approved</strong>.</p>
         <p style="font-size:16px;line-height:1.6;color:#111827;">Our team will be in touch to facilitate the introduction. Please do not contact the candidate directly.</p>`
      : `<p>Your interest request for <strong>${candidateName}</strong> has been <strong style="color:#dc2626;">reviewed</strong> and was not approved at this time.</p>
         ${adminNote ? `<p style="background:#fef3c7;padding:12px;border-left:4px solid #f59e0b;border-radius:4px;"><strong>Note from Admin:</strong><br/>${adminNote}</p>` : ''}`
    }
    <p style="margin-top:24px;">
      <a href="${env.FRONTEND_URL}/recruiter/candidates" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        View Candidates
      </a>
    </p>
    <p style="color:#888;font-size:12px;margin-top:20px;">If you have any questions, please reach out to our support team.</p>
  `;

  await sendMail({ to: recruiterEmail, subject, html });
}

export async function sendInterestRequestRevokedNotification(
  recruiterEmail: string,
  recruiterName: string,
  candidateName: string,
  reason?: string,
): Promise<void> {
  await sendMail({
    to: recruiterEmail,
    subject: 'Agency Interest Request Revoked — NTL Career Nexus',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Agency Interest Request Revoked</h1>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;color:#111827;">Dear <strong>${recruiterName}</strong>,</p>
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            Your previously approved agency interest request for <strong>${candidateName}</strong> has been <strong>revoked</strong> by an administrator.
          </p>
          ${reason ? `<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:20px 0;"><p style="margin:0;font-size:14px;color:#6d28d9;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
          <p style="font-size:14px;color:#6b7280;line-height:1.7;">
            Please contact support for further clarification if required. You may submit a new interest request through the NTL Career Nexus platform if appropriate.
          </p>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This notification was sent by the NTL Career Nexus admin team.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendContactRevokedNotification(
  recruiterEmail: string,
  recruiterName: string,
  candidateName: string,
  reason?: string,
): Promise<void> {
  await sendMail({
    to: recruiterEmail,
    subject: 'Contact Access Revoked — NTL Career Nexus',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Contact Access Revoked</h1>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;color:#111827;">Dear <strong>${recruiterName}</strong>,</p>
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            Your access to the contact details of <strong>${candidateName}</strong> has been <strong>revoked</strong> by an administrator.
          </p>
          ${reason ? '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;"><p style="margin:0;font-size:14px;color:#991b1b;"><strong>Reason:</strong> ' + reason + '</p></div>' : ''}
          <p style="font-size:14px;color:#6b7280;line-height:1.7;">
            If you believe this was done in error or wish to regain access, you may submit a new contact access request through the NTL Career Nexus platform.
          </p>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This notification was sent by the NTL Career Nexus admin team.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendVolunteerInvitation(
  email: string,
  name: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: '🎉 Congratulations on Your Placement — Join the NTL Career Nexus Volunteer Team!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;">Congratulations, ${name}!</h1>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;line-height:1.7;color:#111827;">
            Congratulations on your placement! You are now part of the <strong>NTL Career Nexus success family</strong>.
          </p>
          <p style="font-size:16px;line-height:1.7;color:#111827;">
            Would you like to help other candidates on their journey?
            <strong>Join our volunteer team</strong> — it takes just 5 minutes to set up your profile.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:24px 0;">
            <p style="margin:0;font-size:15px;color:#15803d;font-weight:600;">
              As a NTL Career Nexus Volunteer, you can:
            </p>
            <ul style="margin:12px 0 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
              <li>Share your experience and advice with aspiring candidates</li>
              <li>Help others navigate job placements abroad</li>
              <li>Be featured as a success story on our platform</li>
            </ul>
          </div>
          <p style="font-size:14px;color:#6b7280;margin-top:24px;">
            Our team will be in touch to help you get started. We look forward to having you on board!
          </p>
          <p style="color:#888;font-size:12px;margin-top:20px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This invitation was sent by the NTL Career Nexus admin team. If you have any questions, please reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

// ── Agency Interest Approval: notify candidate ───────────────────────────────

export async function sendCandidateInterestApprovalEmail(
  email: string,
  candidateName: string,
  agencyName: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: 'An agency has expressed interest in your profile — NTL Career Nexus',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Great News, ${candidateName}!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">An agency is interested in your profile</p>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;color:#111827;">Dear <strong>${candidateName}</strong>,</p>
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            We are pleased to inform you that <strong>${agencyName}</strong> has expressed interest in your profile and their request has been <strong>approved</strong>.
          </p>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px;margin:24px 0;">
            <p style="margin:0;font-size:15px;color:#0369a1;font-weight:600;">What happens next?</p>
            <p style="margin:10px 0 0;font-size:14px;color:#374151;line-height:1.7;">
              Our team will be in touch to facilitate the introduction between you and <strong>${agencyName}</strong>. Please ensure your profile and contact details are up to date.
            </p>
          </div>
          <p style="font-size:14px;color:#6b7280;line-height:1.7;">
            If you have any questions, please do not hesitate to contact us.
          </p>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This notification was sent by the NTL Career Nexus admin team.
          </p>
        </div>
      </div>
    `,
  });
}

// ── Agency Interest Approval: admin follow-up reminder ───────────────────────

export async function sendAdminInterestApprovalReminder(
  candidateName: string,
  agencyName: string,
  recruiterName: string,
  recruiterEmail: string,
): Promise<void> {
  const adminEmail = process.env['ADMIN_EMAIL'];
  if (!adminEmail) return;
  await sendMail({
    to: adminEmail,
    subject: `Follow-up needed: Agency interest approved — ${candidateName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Follow-Up Action Required</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Agency interest request has been approved</p>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            An agency interest request has been approved. Please follow up with both parties to facilitate the introduction.
          </p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px;margin:20px 0;">
            <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
              <tr><td style="padding:6px 0;font-weight:600;width:140px;">Candidate:</td><td>${candidateName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:600;">Agency:</td><td>${agencyName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:600;">Recruiter:</td><td>${recruiterName}</td></tr>
              <tr><td style="padding:6px 0;font-weight:600;">Recruiter Email:</td><td><a href="mailto:${recruiterEmail}" style="color:#0284c7;">${recruiterEmail}</a></td></tr>
            </table>
          </div>
          <p style="font-size:14px;color:#6b7280;line-height:1.7;">
            Next step: Contact both the candidate and the agency to coordinate the introduction.
          </p>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This reminder was generated automatically by the NTL Career Nexus platform.
          </p>
        </div>
      </div>
    `,
  });
}

// ── Security Alert: new IP address detected on admin login ───────────────────

export async function sendNewIpLoginAlert(opts: {
  adminName: string;
  adminEmail: string;
  ipAddress: string;
  location: string;
  browser: string;
  os: string;
  time: string;
}): Promise<void> {
  const formattedTime = new Date(opts.time).toLocaleString('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' UTC';

  await sendMail({
    to: opts.adminEmail,
    subject: '⚠️ New Login Location Detected — NTL Career Nexus',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">⚠️ Security Alert</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">New login location detected on your admin account</p>
        </div>
        <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            Hi ${opts.adminName},
          </p>
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            We detected a login to your NTL Career Nexus admin account from a <strong>new IP address</strong> that has not been seen before.
          </p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin:20px 0;">
            <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
              <tr><td style="padding:8px 0;font-weight:600;width:140px;color:#991b1b;">IP Address:</td><td style="font-family:monospace;font-size:14px;">${opts.ipAddress}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600;color:#991b1b;">Location:</td><td>${opts.location}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600;color:#991b1b;">Browser:</td><td>${opts.browser}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600;color:#991b1b;">Operating System:</td><td>${opts.os}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600;color:#991b1b;">Time:</td><td>${formattedTime}</td></tr>
            </table>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:20px 0;">
            <p style="margin:0;font-size:14px;color:#166534;">
              <strong>If this was you</strong> — no action is needed. This alert is sent whenever a new IP address is used to log in.
            </p>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin:20px 0;">
            <p style="margin:0;font-size:14px;color:#9a3412;">
              <strong>If this was NOT you</strong> — your account may be compromised. Please contact the system administrator immediately and change your password.
            </p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
            This security alert was sent automatically by the NTL Career Nexus platform. Do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}
