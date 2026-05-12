// src/modules/agency-interest-requests/agency-interest-requests.service.ts
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import {
  sendInterestRequestNotification,
  sendInterestRequestReviewed,
  sendCandidateInterestApprovalEmail,
  sendAdminInterestApprovalReminder,
} from '../../services/email.service';
import type { CreateInterestRequestDto, ReviewInterestRequestDto, InterestRequestFilterDto } from './agency-interest-requests.dto';

// ── Submit (agency recruiter) ────────────────────────────────────────────────

export async function createInterestRequest(recruiterId: string, dto: CreateInterestRequestDto) {
  const candidate = await db('candidates').where({ id: dto.candidate_id }).first();
  if (!candidate) throw new AppError(404, 'Candidate not found');

  const existing = await db('agency_interest_requests')
    .where({ recruiter_id: recruiterId, candidate_id: dto.candidate_id })
    .first();

  if (existing) {
    if (existing.status === 'approved') throw new AppError(409, 'An approved introduction already exists for this candidate.');
    if (existing.status === 'pending')  throw new AppError(409, 'An interest request is already pending for this candidate.');
    // rejected — allow re-request
    await db('agency_interest_requests').where({ id: existing.id }).delete();
  }

  const [row] = await db('agency_interest_requests')
    .insert({
      recruiter_id: recruiterId,
      candidate_id: dto.candidate_id,
      sector:       dto.sector,
      country:      dto.country,
      message:      dto.message,
    })
    .returning('*');

  // Notify admin (non-fatal)
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.contact_name', 'r.company_name', 'u.email')
    .where('r.id', recruiterId)
    .first();

  if (recruiter) {
    sendInterestRequestNotification(
      recruiter.contact_name,
      recruiter.company_name ?? '',
      recruiter.email,
      `${candidate.first_name} ${candidate.last_name}`,
    ).catch(() => { /* non-fatal */ });
  }

  return row;
}

// ── List all (admin) ─────────────────────────────────────────────────────────

export async function listInterestRequests(filters: InterestRequestFilterDto) {
  const { page, limit, status, search, date_from, date_to } = filters;
  const offset = (page - 1) * limit;

  let query = db('agency_interest_requests as ir')
    .join('recruiters as r',  'r.id',  'ir.recruiter_id')
    .join('users as ru',      'ru.id', 'r.user_id')
    .join('candidates as c',  'c.id',  'ir.candidate_id')
    .leftJoin('users as rev', 'rev.id', 'ir.reviewed_by')
    .select(
      'ir.id',
      'ir.recruiter_id',
      'ir.candidate_id',
      'ir.sector',
      'ir.country',
      'ir.message',
      'ir.status',
      'ir.admin_note',
      'ir.created_at',
      'ir.reviewed_at',
      'r.contact_name as recruiter_name',
      'r.company_name as recruiter_company',
      'ru.email as recruiter_email',
      'c.first_name as candidate_first_name',
      'c.last_name as candidate_last_name',
      'c.candidate_number',
    );

  if (status) query = query.where('ir.status', status);

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.where(function () {
      this.whereRaw(`LOWER(r.contact_name) LIKE ?`, [term])
          .orWhereRaw(`LOWER(r.company_name) LIKE ?`, [term])
          .orWhereRaw(`LOWER(c.first_name || ' ' || c.last_name) LIKE ?`, [term]);
    });
  }

  if (date_from) query = query.where('ir.created_at', '>=', new Date(date_from));
  if (date_to) {
    const to = new Date(date_to);
    to.setHours(23, 59, 59, 999);
    query = query.where('ir.created_at', '<=', to);
  }

  const countQuery = query.clone().clearSelect().count('ir.id as count');
  const [{ count }] = await countQuery;

  const data = await query.orderBy('ir.created_at', 'desc').limit(limit).offset(offset);
  const total = Number(count);

  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Get my own requests (agency recruiter) ───────────────────────────────────

export async function getMyInterestRequests(recruiterId: string) {
  return db('agency_interest_requests')
    .where({ recruiter_id: recruiterId })
    .select('id', 'candidate_id', 'sector', 'country', 'message', 'status', 'admin_note', 'created_at', 'reviewed_at')
    .orderBy('created_at', 'desc');
}

// ── Review (admin) ───────────────────────────────────────────────────────────

export async function reviewInterestRequest(
  id: string,
  dto: ReviewInterestRequestDto,
  adminUserId?: string,
) {
  const req = await db('agency_interest_requests').where({ id }).first();
  if (!req) throw new AppError(404, 'Interest request not found');
  if (req.status !== 'pending') throw new AppError(400, 'Request has already been reviewed');

  const [updated] = await db('agency_interest_requests')
    .where({ id })
    .update({
      status:      dto.status,
      admin_note:  dto.admin_note ?? null,
      reviewed_at: new Date(),
      reviewed_by: adminUserId ?? null,
    })
    .returning('*');

  // Send email to agency recruiter (non-fatal)
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.contact_name', 'r.company_name', 'u.email')
    .where('r.id', req.recruiter_id)
    .first();

  const candidate = await db('candidates as c')
    .join('users as u', 'u.id', 'c.user_id')
    .select('c.first_name', 'c.last_name', 'u.email as candidate_email')
    .where('c.id', req.candidate_id)
    .first();

  const candidateName  = candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Candidate';
  const agencyName     = recruiter?.company_name ?? recruiter?.contact_name ?? 'Agency';
  const recruiterName  = recruiter?.contact_name ?? '';
  const recruiterEmail = recruiter?.email ?? '';

  // Email: notify recruiter of outcome (non-fatal)
  if (recruiter && candidate) {
    sendInterestRequestReviewed(
      recruiterEmail,
      recruiterName,
      candidateName,
      dto.status,
      dto.admin_note,
    ).catch(() => { /* non-fatal */ });
  }

  // On approval only: notify candidate + send admin reminder + log activity
  if (dto.status === 'approved') {
    // Notify candidate by email
    if (candidate?.candidate_email) {
      sendCandidateInterestApprovalEmail(
        candidate.candidate_email,
        candidateName,
        agencyName,
      ).catch(() => { /* non-fatal */ });
    }

    // Remind admin to follow up
    sendAdminInterestApprovalReminder(
      candidateName,
      agencyName,
      recruiterName,
      recruiterEmail,
    ).catch(() => { /* non-fatal */ });

    // Log to candidate_activity
    db('candidate_activity').insert({
      candidate_id: req.candidate_id,
      type:         'agency_interest_approved',
      description:  `Agency interest — ${agencyName} — Approved`,
      metadata:     JSON.stringify({
        request_id:   id,
        recruiter_id: req.recruiter_id,
        agency:       agencyName,
        recruiter:    recruiterName,
      }),
    }).catch(() => { /* non-fatal */ });
  }

  return updated;
}

// ── Export CSV (admin) ───────────────────────────────────────────────────────

export async function exportInterestRequests(
  filters: Omit<InterestRequestFilterDto, 'page' | 'limit'>,
): Promise<string> {
  const { status, search, date_from, date_to } = filters;

  let query = db('agency_interest_requests as ir')
    .join('recruiters as r',  'r.id',  'ir.recruiter_id')
    .join('users as ru',      'ru.id', 'r.user_id')
    .join('candidates as c',  'c.id',  'ir.candidate_id')
    .leftJoin('users as rev', 'rev.id', 'ir.reviewed_by')
    .select(
      'ir.id',
      'ir.sector',
      'ir.country',
      'ir.message',
      'ir.status',
      'ir.admin_note',
      'ir.created_at',
      'ir.reviewed_at',
      'r.contact_name as recruiter_name',
      'r.company_name as recruiter_company',
      'ru.email as recruiter_email',
      'c.first_name as candidate_first_name',
      'c.last_name as candidate_last_name',
      'c.candidate_number',
    );

  if (status) query = query.where('ir.status', status);

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.where(function () {
      this.whereRaw(`LOWER(r.contact_name) LIKE ?`, [term])
          .orWhereRaw(`LOWER(r.company_name) LIKE ?`, [term])
          .orWhereRaw(`LOWER(c.first_name || ' ' || c.last_name) LIKE ?`, [term]);
    });
  }

  if (date_from) query = query.where('ir.created_at', '>=', new Date(date_from));
  if (date_to) {
    const to = new Date(date_to);
    to.setHours(23, 59, 59, 999);
    query = query.where('ir.created_at', '<=', to);
  }

  const rows = await query.orderBy('ir.created_at', 'desc');

  const escape  = (v: unknown) => { const s = String(v ?? '').replace(/"/g, '""'); return `"${s}"`; };
  const fmtDate = (v: unknown) => v ? new Date(String(v)).toISOString().split('T')[0] : '';

  const headers = [
    'Request ID',
    'Agency (Company)',
    'Recruiter Name',
    'Recruiter Email',
    'Candidate Name',
    'Candidate Number',
    'Sector',
    'Country',
    'Message',
    'Status',
    'Admin Note',
    'Date Submitted',
    'Reviewed At',
  ];

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r: any) => [
      r.id,
      r.recruiter_company ?? '',
      r.recruiter_name    ?? '',
      r.recruiter_email   ?? '',
      `${r.candidate_first_name ?? ''} ${r.candidate_last_name ?? ''}`.trim(),
      r.candidate_number  ?? '',
      r.sector            ?? '',
      r.country           ?? '',
      r.message           ?? '',
      r.status            ?? '',
      r.admin_note        ?? '',
      fmtDate(r.created_at),
      fmtDate(r.reviewed_at),
    ].map(escape).join(',')),
  ];

  return lines.join('\n');
}

// ── Pending count (admin sidebar badge) ─────────────────────────────────────

export async function getPendingInterestRequestCount(): Promise<number> {
  const [{ count }] = await db('agency_interest_requests').where({ status: 'pending' }).count('id as count');
  return Number(count);
}
