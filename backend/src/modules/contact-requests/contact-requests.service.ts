// src/modules/contact-requests/contact-requests.service.ts
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { sendContactRequestApprovedNotification, sendContactRequestRejectedNotification } from '../../services/email.service';
import type { ReviewContactRequestDto } from './contact-requests.dto';

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

export async function listContactRequests(filters: {
  status?: string;
  page: number;
  limit: number;
}) {
  const { page, limit, status } = filters;
  const offset = (page - 1) * limit;

  let query = db('contact_unlock_requests as cr')
    .join('recruiters as r',   'r.id',  'cr.recruiter_id')
    .join('users as ru',       'ru.id', 'r.user_id')
    .join('candidates as c',   'c.id',  'cr.candidate_id')
    .join('users as cu',       'cu.id', 'c.user_id')
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
    );

  if (status) query = query.where('cr.status', status);

  const [{ count }] = await db('contact_unlock_requests as cr')
    .modify((q) => { if (status) q.where('cr.status', status); })
    .count('cr.id as count');

  const data = await query.orderBy('cr.created_at', 'desc').limit(limit).offset(offset);
  const total = Number(count);

  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Review a request (admin) ─────────────────────────────────────────────────

export async function reviewContactRequest(id: string, dto: ReviewContactRequestDto) {
  const req = await db('contact_unlock_requests').where({ id }).first();
  if (!req) throw new AppError(404, 'Contact request not found');
  if (req.status !== 'pending') throw new AppError(400, 'Request has already been reviewed');

  const [updated] = await db('contact_unlock_requests')
    .where({ id })
    .update({
      status:      dto.status,
      admin_note:  dto.admin_note ?? null,
      reviewed_at: new Date(),
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
