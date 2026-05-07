// src/modules/volunteer-support-requests/volunteer-support-requests.service.ts
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { sendAdminVolunteerSupportNotification } from '../../services/email.service';
import type {
  CreateSupportRequestDto,
  ReviewSupportRequestDto,
  SupportRequestFilterDto,
} from './volunteer-support-requests.dto';

// ── Create (candidate → admin) ────────────────────────────────────────────────

export async function createSupportRequest(
  userId: string,
  volunteerId: string,
  dto: CreateSupportRequestDto,
) {
  // Resolve candidate from JWT userId
  const candidate = await db('candidates as c')
    .join('users as u', 'u.id', 'c.user_id')
    .select('c.id', 'c.first_name', 'c.last_name', 'u.email')
    .where('c.user_id', userId)
    .first();
  if (!candidate) throw new AppError(404, 'Candidate profile not found');

  // Verify volunteer exists
  const volunteer = await db('volunteers').where({ id: volunteerId }).first();
  if (!volunteer) throw new AppError(404, 'Volunteer not found');

  // Check for existing pending/connected request (allow new if previous is closed)
  const existing = await db('volunteer_support_requests')
    .where({ candidate_id: candidate.id, volunteer_id: volunteerId })
    .whereIn('status', ['pending', 'connected'])
    .first();
  if (existing) {
    throw new AppError(409, 'You already have an active support request for this volunteer.');
  }

  const [row] = await db('volunteer_support_requests')
    .insert({
      candidate_id: candidate.id,
      volunteer_id: volunteerId,
      message:      dto.message ?? null,
      status:       'pending',
    })
    .returning('*');

  // Notify admin (non-fatal)
  const candidateName = `${candidate.first_name} ${candidate.last_name}`;
  sendAdminVolunteerSupportNotification(candidateName, volunteer.name).catch(() => {});

  return row;
}

// ── List (admin) ──────────────────────────────────────────────────────────────

export async function listSupportRequests(filters: SupportRequestFilterDto) {
  const { page, limit, status, search } = filters;
  const offset = (page - 1) * limit;

  let query = db('volunteer_support_requests as vsr')
    .join('candidates as c',  'c.id',  'vsr.candidate_id')
    .join('users as u',       'u.id',  'c.user_id')
    .join('volunteers as v',  'v.id',  'vsr.volunteer_id')
    .select(
      'vsr.id',
      'vsr.candidate_id',
      'vsr.volunteer_id',
      'vsr.message',
      'vsr.status',
      'vsr.admin_note',
      'vsr.created_at',
      'vsr.updated_at',
      'c.first_name as candidate_first_name',
      'c.last_name as candidate_last_name',
      'u.email as candidate_email',
      'v.name as volunteer_name',
      'v.role as volunteer_role',
    );

  if (status) query = query.where('vsr.status', status);

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.where(function () {
      this.whereRaw(`LOWER(c.first_name || ' ' || c.last_name) LIKE ?`, [term])
          .orWhereRaw(`LOWER(v.name) LIKE ?`, [term]);
    });
  }

  const countQuery = query.clone().clearSelect().count('vsr.id as count').first();
  const [countRow, rows] = await Promise.all([
    countQuery,
    query.clone().orderBy('vsr.created_at', 'desc').limit(limit).offset(offset),
  ]);

  const total = parseInt((countRow as any)?.count ?? '0', 10);
  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Review (admin) ────────────────────────────────────────────────────────────

export async function reviewSupportRequest(id: string, dto: ReviewSupportRequestDto) {
  const row = await db('volunteer_support_requests').where({ id }).first();
  if (!row) throw new AppError(404, 'Support request not found');

  const [updated] = await db('volunteer_support_requests')
    .where({ id })
    .update({
      status:     dto.status,
      admin_note: dto.admin_note ?? null,
      updated_at: db.fn.now(),
    })
    .returning('*');

  return updated;
}

// ── Counts (admin) ────────────────────────────────────────────────────────────

export async function getSupportRequestCounts() {
  const rows = await db('volunteer_support_requests')
    .select('status')
    .count('id as count')
    .groupBy('status');

  const map: Record<string, number> = {};
  for (const r of rows) map[r.status as string] = parseInt(r.count as string, 10);

  return {
    pending:   map['pending']   ?? 0,
    connected: map['connected'] ?? 0,
    closed:    map['closed']    ?? 0,
    total:     (map['pending'] ?? 0) + (map['connected'] ?? 0) + (map['closed'] ?? 0),
  };
}

// ── Get my requests (candidate) ───────────────────────────────────────────────

export async function getMySupportRequests(userId: string) {
  const candidate = await db('candidates').where({ user_id: userId }).first();
  if (!candidate) throw new AppError(404, 'Candidate profile not found');

  return db('volunteer_support_requests')
    .where({ candidate_id: candidate.id })
    .select('id', 'volunteer_id', 'status', 'message', 'admin_note', 'created_at')
    .orderBy('created_at', 'desc');
}
