// src/modules/recruiter-access-requests/recruiter-access-requests.service.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import {
  sendAdminRecruiterAccessRequest,
  sendRecruiterAccessRequestApproved,
  sendRecruiterAccessRequestRejected,
} from '../../services/email.service';
import type {
  SubmitRecruiterAccessRequestDto,
  ListRecruiterAccessRequestsDto,
  ReviewRecruiterAccessRequestDto,
} from './recruiter-access-requests.dto';

// ── Submit (recruiter) ────────────────────────────────────────────────────────

export async function submitRecruiterAccessRequest(dto: SubmitRecruiterAccessRequestDto) {
  // Resolve user by email (join users + roles)
  const user = await db('users as u')
    .join('roles as r', 'r.id', 'u.role_id')
    .select('u.id', 'u.email', 'r.name as role_name')
    .where('u.email', dto.email)
    .first();

  if (!user) throw new AppError(404, 'No user found with that email.');
  if (user.role_name !== 'recruiter') throw new AppError(400, 'User is not a recruiter.');

  // Check for existing pending request
  const existing = await db('recruiter_access_requests')
    .where({ user_id: user.id, status: 'pending' })
    .first();
  if (existing) throw new AppError(409, 'You already have a pending access extension request.');

  // Get recruiter name, fallback to email
  const recruiter = await db('recruiters')
    .select('contact_name')
    .where({ user_id: user.id })
    .first();

  const name = recruiter?.contact_name || user.email;

  const id = uuidv4();
  await db('recruiter_access_requests').insert({
    id,
    user_id: user.id,
    email: user.email,
    message: dto.message ?? null,
    status: 'pending',
  });

  // Send admin notification (non-fatal)
  sendAdminRecruiterAccessRequest({ name, email: user.email, message: dto.message ?? null }).catch(() => { /* non-fatal */ });

  return { id };
}

// ── List (admin) ──────────────────────────────────────────────────────────────

export async function listRecruiterAccessRequests(dto: ListRecruiterAccessRequestsDto) {
  const { status, search, date_from, date_to, sort, page, limit } = dto;
  const offset = (page - 1) * limit;

  let base = db('recruiter_access_requests as r')
    .leftJoin('users as u', 'u.id', 'r.reviewed_by')
    .leftJoin('admins as a', 'a.user_id', 'u.id')
    .select(
      'r.id',
      'r.user_id',
      'r.email',
      'r.message',
      'r.status',
      'r.admin_note',
      'r.reviewed_at',
      'r.created_at',
      db.raw(`COALESCE(a.first_name || ' ' || a.last_name, u.email) as reviewed_by_name`),
    );

  if (status)    base = base.where('r.status', status);
  if (search)    base = base.whereILike('r.email', `%${search}%`);
  if (date_from) base = base.where('r.created_at', '>=', new Date(date_from));
  if (date_to)   base = base.where('r.created_at', '<=', new Date(date_to + 'T23:59:59'));

  const direction = sort === 'oldest' ? 'asc' : 'desc';
  const countQuery = (base.clone().clearSelect().count('* as total').first() as unknown) as Promise<{ total: string | number }>;
  const [countResult, rows] = await Promise.all([
    countQuery,
    base.clone().orderBy('r.created_at', direction).offset(offset).limit(limit),
  ]);

  const total = Number(countResult?.total ?? 0);
  const pages = Math.ceil(total / limit);

  return {
    data: rows,
    pagination: { page, limit, total, pages },
  };
}

// ── Counts (admin) ────────────────────────────────────────────────────────────

export async function getRecruiterAccessRequestCounts() {
  const rows = await db('recruiter_access_requests')
    .select('status')
    .count('* as count')
    .groupBy('status');

  const result = { pending: 0, approved: 0, rejected: 0, total: 0 };
  for (const row of rows) {
    const count = Number((row as any).count);
    const s = (row as any).status as 'pending' | 'approved' | 'rejected';
    if (s in result) result[s] = count;
    result.total += count;
  }

  return result;
}

// ── Review (admin) ────────────────────────────────────────────────────────────

export async function reviewRecruiterAccessRequest(
  id: string,
  reviewedByUserId: string,
  dto: ReviewRecruiterAccessRequestDto,
) {
  if (dto.status === 'approved' && !dto.new_expires_at) {
    throw new AppError(400, 'new_expires_at is required when approving.');
  }

  const req = await db('recruiter_access_requests').where({ id }).first();
  if (!req) throw new AppError(404, 'Recruiter access request not found.');
  if (req.status !== 'pending') throw new AppError(409, 'Request has already been reviewed.');

  await db('recruiter_access_requests').where({ id }).update({
    status: dto.status,
    admin_note: dto.admin_note ?? null,
    reviewed_by: reviewedByUserId,
    reviewed_at: new Date(),
    updated_at: new Date(),
  });

  if (dto.status === 'approved' && dto.new_expires_at) {
    await db('recruiters')
      .where({ user_id: req.user_id })
      .update({ access_expires_at: new Date(dto.new_expires_at) });
  }

  // Get recruiter name for email
  const recruiter = await db('recruiters')
    .select('contact_name')
    .where({ user_id: req.user_id })
    .first();

  const name = recruiter?.contact_name || req.email;

  if (dto.status === 'approved' && dto.new_expires_at) {
    const newExpiryDate = new Date(dto.new_expires_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    sendRecruiterAccessRequestApproved({ email: req.email, name, newExpiryDate }).catch(() => { /* non-fatal */ });
  } else if (dto.status === 'rejected') {
    sendRecruiterAccessRequestRejected({ email: req.email, name, adminNote: dto.admin_note ?? null }).catch(() => { /* non-fatal */ });
  }

  return { id };
}
