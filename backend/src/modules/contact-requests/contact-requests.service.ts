// src/modules/contact-requests/contact-requests.service.ts
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { sendContactRequestApprovedNotification, sendContactRequestRejectedNotification } from '../../services/email.service';
import type { ReviewContactRequestDto, BulkReviewContactRequestDto, ContactRequestFilterDto } from './contact-requests.dto';

// ── Create a request (recruiter → admin) ────────────────────────────────────

export async function createContactRequest(recruiterId: string, candidateId: string) {
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
    // rejected — allow re-request: delete old and create new
    await db('contact_unlock_requests').where({ id: existing.id }).delete();
  }

  const [row] = await db('contact_unlock_requests')
    .insert({ recruiter_id: recruiterId, candidate_id: candidateId })
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
    .select(
      'cr.id',
      'cr.recruiter_id',
      'cr.candidate_id',
      'cr.status',
      'cr.admin_note',
      'cr.created_at',
      'cr.reviewed_at',
      'r.contact_name as recruiter_name',
      'r.company_name as recruiter_company',
      'ru.email as recruiter_email',
      'c.first_name as candidate_first_name',
      'c.last_name as candidate_last_name',
      'c.candidate_number',
      'c.job_title as candidate_job_title',
      'cu.email as candidate_email',
      db.raw(`TRIM(a.first_name || ' ' || COALESCE(a.last_name, '')) as reviewed_by_name`),
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
    .select('cr.id', 'cr.candidate_id', 'cr.status', 'cr.admin_note', 'cr.created_at', 'cr.reviewed_at');
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

  const result = { pending: 0, approved: 0, rejected: 0, total: 0 };
  for (const row of rows) {
    const n = Number(row.count);
    if (row.status === 'pending')  result.pending  = n;
    if (row.status === 'approved') result.approved = n;
    if (row.status === 'rejected') result.rejected = n;
    result.total += n;
  }
  return result;
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
