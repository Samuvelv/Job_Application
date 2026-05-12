// src/modules/contact-requests/contact-requests.service.ts
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { sendContactRequestApprovedNotification, sendContactRequestRejectedNotification, sendContactRevokedNotification } from '../../services/email.service';
import type { ReviewContactRequestDto, BulkReviewContactRequestDto, ContactRequestFilterDto, RevokeContactRequestDto, CreateContactRequestDto } from './contact-requests.dto';

// ── Create a request (recruiter → admin) ────────────────────────────────────

export async function createContactRequest(recruiterId: string, candidateId: string, dto: CreateContactRequestDto) {
  // Verify candidate exists
  const candidate = await db('candidates').where({ id: candidateId }).first();
  if (!candidate) throw new AppError(404, 'Candidate not found');

  // Check for duplicate
  const existing = await db('contact_unlock_requests')
    .where({ recruiter_id: recruiterId, candidate_id: candidateId })
    .first();
  if (existing) {
    if (existing.status === 'approved') throw new AppError(409, 'Contact info is already unlocked for this candidate.');
    if (existing.status === 'pending')  throw new AppError(409, 'A request is already pending for this candidate.');
    // rejected or revoked — allow re-request: delete old and create new
    await db('contact_unlock_requests').where({ id: existing.id }).delete();
  }

  const [row] = await db('contact_unlock_requests')
    .insert({ recruiter_id: recruiterId, candidate_id: candidateId, request_reason: dto.request_reason ?? null })
    .returning('*');
  return row;
}

// ── List all requests (admin) ────────────────────────────────────────────────

export async function listContactRequests(filters: ContactRequestFilterDto) {
  const { page, limit, status, search, date_from, date_to } = filters;
  const offset = (page - 1) * limit;

  let query = db('contact_unlock_requests as cr')
    .join('recruiters as r',   'r.id',  'cr.recruiter_id')
    .join('users as ru',       'ru.id', 'r.user_id')
    .join('candidates as c',   'c.id',  'cr.candidate_id')
    .join('users as cu',       'cu.id', 'c.user_id')
    .leftJoin('admins as a',   'a.user_id', 'cr.reviewed_by_id')
    .leftJoin('admins as ra',  'ra.user_id', 'cr.revoked_by_id')
    .select(
      'cr.id',
      'cr.recruiter_id',
      'cr.candidate_id',
      'cr.status',
      'cr.admin_note',
      'cr.request_reason',
      'cr.created_at',
      'cr.reviewed_at',
      'cr.revoked_at',
      'cr.revocation_reason',
      'r.contact_name as recruiter_name',
      'r.company_name as recruiter_company',
      'ru.email as recruiter_email',
      'c.first_name as candidate_first_name',
      'c.last_name as candidate_last_name',
      'c.candidate_number',
      'c.job_title as candidate_job_title',
      'cu.email as candidate_email',
      db.raw(`TRIM(a.first_name || ' ' || COALESCE(a.last_name, '')) as reviewed_by_name`),
      db.raw(`TRIM(ra.first_name || ' ' || COALESCE(ra.last_name, '')) as revoked_by_name`),
    );

  if (status) query = query.where('cr.status', status);

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.where(function () {
      this.whereRaw(`LOWER(r.contact_name) LIKE ?`, [term])
          .orWhereRaw(`LOWER(c.first_name || ' ' || c.last_name) LIKE ?`, [term]);
    });
  }

  if (date_from) {
    query = query.where('cr.created_at', '>=', new Date(date_from));
  }

  if (date_to) {
    const to = new Date(date_to);
    to.setHours(23, 59, 59, 999);
    query = query.where('cr.created_at', '<=', to);
  }

  const countQuery = query.clone().clearSelect().count('cr.id as count');
  const [{ count }] = await countQuery;

  const data = await query.orderBy('cr.created_at', 'desc').limit(limit).offset(offset);
  const total = Number(count);

  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Review a request (admin) ─────────────────────────────────────────────────

export async function reviewContactRequest(id: string, dto: ReviewContactRequestDto, adminUserId?: string) {
  const req = await db('contact_unlock_requests').where({ id }).first();
  if (!req) throw new AppError(404, 'Contact request not found');
  if (req.status !== 'pending') throw new AppError(400, 'Request has already been reviewed');

  const [updated] = await db('contact_unlock_requests')
    .where({ id })
    .update({
      status:          dto.status,
      admin_note:      dto.admin_note ?? null,
      reviewed_at:     new Date(),
      reviewed_by_id:  adminUserId ?? null,
    })
    .returning('*');

  // Fetch recruiter and candidate details for email notification
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.contact_name', 'u.email')
    .where('r.id', req.recruiter_id)
    .first();

  const candidate = await db('candidates')
    .select('first_name', 'last_name')
    .where('id', req.candidate_id)
    .first();

  if (recruiter && candidate) {
    const recruiterName = recruiter.contact_name;
    const recruiterEmail = recruiter.email;
    const candidateName = `${candidate.first_name} ${candidate.last_name}`;

    if (dto.status === 'approved') {
      // Send approval notification (non-fatal)
      sendContactRequestApprovedNotification(
        recruiterEmail,
        recruiterName,
        candidateName,
      ).catch(() => { /* non-fatal */ });
    } else {
      // Send rejection notification (non-fatal)
      sendContactRequestRejectedNotification(
        recruiterEmail,
        recruiterName,
      ).catch(() => { /* non-fatal */ });
    }
  }

  return updated;
}

// ── Get recruiter's own requests ─────────────────────────────────────────────

export async function getMyContactRequests(recruiterId: string) {
  return db('contact_unlock_requests as cr')
    .where('cr.recruiter_id', recruiterId)
    .select('cr.id', 'cr.candidate_id', 'cr.status', 'cr.admin_note', 'cr.request_reason', 'cr.created_at', 'cr.reviewed_at');
}

// ── Check if a recruiter has approved access for a candidate ─────────────────

export async function isContactUnlocked(recruiterId: string, candidateId: string): Promise<boolean> {
  const row = await db('contact_unlock_requests')
    .where({ recruiter_id: recruiterId, candidate_id: candidateId, status: 'approved' })
    .first();
  return !!row;
}

// ── Counts (admin) ───────────────────────────────────────────────────────────

export async function getContactRequestCounts() {
  const rows = await db('contact_unlock_requests')
    .select('status')
    .count('id as count')
    .groupBy('status');

  const result = { pending: 0, approved: 0, rejected: 0, revoked: 0, total: 0 };
  for (const row of rows) {
    const n = Number(row.count);
    if (row.status === 'pending')  result.pending  = n;
    if (row.status === 'approved') result.approved = n;
    if (row.status === 'rejected') result.rejected = n;
    if (row.status === 'revoked')  result.revoked  = n;
    result.total += n;
  }
  return result;
}

// ── Revoke an approved request (admin) ──────────────────────────────────────

export async function revokeContactRequest(id: string, dto: RevokeContactRequestDto, adminUserId?: string) {
  const req = await db('contact_unlock_requests').where({ id }).first();
  if (!req) throw new AppError(404, 'Contact request not found');
  if (req.status !== 'approved') throw new AppError(400, 'Only approved requests can be revoked');

  const [updated] = await db('contact_unlock_requests')
    .where({ id })
    .update({
      status:            'revoked',
      revoked_at:        new Date(),
      revoked_by_id:     adminUserId ?? null,
      revocation_reason: dto.reason ?? null,
    })
    .returning('*');

  // Notify recruiter (non-fatal)
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.contact_name', 'u.email')
    .where('r.id', req.recruiter_id)
    .first();

  const candidate = await db('candidates')
    .select('first_name', 'last_name')
    .where('id', req.candidate_id)
    .first();

  if (recruiter && candidate) {
    sendContactRevokedNotification(
      recruiter.email,
      recruiter.contact_name,
      `${candidate.first_name} ${candidate.last_name}`,
      dto.reason,
    ).catch(() => { /* non-fatal */ });
  }

  return updated;
}

// ── Export CSV (admin) ───────────────────────────────────────────────────────

export async function exportContactRequests(
  filters: Omit<ContactRequestFilterDto, 'page' | 'limit'>,
): Promise<string> {
  const { status, search, date_from, date_to } = filters;

  let query = db('contact_unlock_requests as cr')
    .join('recruiters as r',   'r.id',  'cr.recruiter_id')
    .join('users as ru',       'ru.id', 'r.user_id')
    .join('candidates as c',   'c.id',  'cr.candidate_id')
    .join('users as cu',       'cu.id', 'c.user_id')
    .leftJoin('admins as a',   'a.user_id', 'cr.reviewed_by_id')
    .leftJoin('admins as ra',  'ra.user_id', 'cr.revoked_by_id')
    .select(
      'cr.id',
      'cr.status',
      'cr.request_reason',
      'cr.admin_note',
      'cr.created_at',
      'cr.reviewed_at',
      'cr.revoked_at',
      'cr.revocation_reason',
      'r.contact_name as recruiter_name',
      'r.company_name as recruiter_company',
      'ru.email as recruiter_email',
      'c.first_name as candidate_first_name',
      'c.last_name as candidate_last_name',
      'c.candidate_number',
      'c.job_title as candidate_job_title',
      'cu.email as candidate_email',
      db.raw(`TRIM(a.first_name || ' ' || COALESCE(a.last_name, '')) as reviewed_by_name`),
      db.raw(`TRIM(ra.first_name || ' ' || COALESCE(ra.last_name, '')) as revoked_by_name`),
    );

  if (status) query = query.where('cr.status', status);

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.where(function () {
      this.whereRaw(`LOWER(r.contact_name) LIKE ?`, [term])
          .orWhereRaw(`LOWER(c.first_name || ' ' || c.last_name) LIKE ?`, [term]);
    });
  }

  if (date_from) query = query.where('cr.created_at', '>=', new Date(date_from));
  if (date_to) {
    const to = new Date(date_to);
    to.setHours(23, 59, 59, 999);
    query = query.where('cr.created_at', '<=', to);
  }

  const rows = await query.orderBy('cr.created_at', 'desc');

  const escape  = (v: unknown) => { const s = String(v ?? '').replace(/"/g, '""'); return `"${s}"`; };
  const fmtDate = (v: unknown) => v ? new Date(String(v)).toISOString().split('T')[0] : '';

  const headers = [
    'Request ID',
    'Recruiter Name',
    'Company',
    'Recruiter Email',
    'Candidate Name',
    'Candidate Number',
    'Candidate Job Title',
    'Candidate Email',
    'Reason for Request',
    'Status',
    'Admin Note',
    'Date Submitted',
    'Reviewed At',
    'Reviewed By',
    'Revoked At',
    'Revoked By',
    'Revocation Reason',
  ];

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r: any) => [
      r.id,
      r.recruiter_name          ?? '',
      r.recruiter_company       ?? '',
      r.recruiter_email         ?? '',
      `${r.candidate_first_name ?? ''} ${r.candidate_last_name ?? ''}`.trim(),
      r.candidate_number        ?? '',
      r.candidate_job_title     ?? '',
      r.candidate_email         ?? '',
      r.request_reason          ?? '',
      r.status                  ?? '',
      r.admin_note              ?? '',
      fmtDate(r.created_at),
      fmtDate(r.reviewed_at),
      r.reviewed_by_name        ?? '',
      fmtDate(r.revoked_at),
      r.revoked_by_name         ?? '',
      r.revocation_reason       ?? '',
    ].map(escape).join(',')),
  ];

  return lines.join('\n');
}

// ── Bulk review (admin) ───────────────────────────────────────────────────────

export async function bulkReviewContactRequests(dto: BulkReviewContactRequestDto, adminUserId?: string) {
  const succeeded: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const id of dto.ids) {
    try {
      await reviewContactRequest(id, { status: dto.status, admin_note: dto.admin_note }, adminUserId);
      succeeded.push(id);
    } catch (err: any) {
      failed.push({ id, reason: err?.message ?? 'Unknown error' });
    }
  }

  return { succeeded, failed };
}
