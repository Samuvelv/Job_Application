// src/modules/edit-requests/edit-requests.service.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { updateCandidate } from '../candidates/candidates.service';
import { sendEditRequestStatus, sendAdminEditRequestNotification } from '../../services/email.service';
import type {
  SubmitEditRequestDto,
  ReviewEditRequestDto,
  EditRequestFilterDto,
} from './edit-requests.dto';

// ── Submit (candidate) ─────────────────────────────────────────────────────────

export async function submitEditRequest(
  userId: string,
  dto: SubmitEditRequestDto,
) {
  // Resolve candidate from user
  const candidate = await db('candidates as e')
    .join('users as u', 'u.id', 'e.user_id')
    .select('e.id', 'e.first_name', 'e.last_name', 'u.email')
    .where('e.user_id', userId)
    .first();
  if (!candidate) throw new AppError(404, 'Candidate profile not found');

  // Block if there is already an open pending request
  const existing = await db('profile_edit_requests')
    .where({ candidate_id: candidate.id, status: 'pending' })
    .first();
  if (existing) throw new AppError(409, 'You already have a pending edit request');

  // Extract reason from dto (if provided)
  const { reason, ...requestedData } = dto;

  // Get current candidate data to store as old values
  const candidateData = await db('candidates').where({ id: candidate.id }).first();
  const oldValues: Record<string, unknown> = {};
  
  // Extract only the fields that are being changed
  Object.keys(requestedData).forEach(key => {
    if (key in candidateData) {
      oldValues[key] = candidateData[key];
    }
  });

  const id = uuidv4();
  await db('profile_edit_requests').insert({
    id,
    candidate_id:    candidate.id,
    requested_data: JSON.stringify(requestedData),
    old_values:     JSON.stringify(oldValues),
    reason:         reason ?? null,
    status:         'pending',
  });

  // Mark profile as pending_edit
  await db('candidates')
    .where({ id: candidate.id })
    .update({ profile_status: 'pending_edit', updated_at: new Date() });

  // Send admin notification (non-fatal)
  sendAdminEditRequestNotification(
    `${candidate.first_name} ${candidate.last_name}`,
    candidate.email,
  ).catch(() => { /* non-fatal */ });

  return getEditRequestById(id);
}

// ── List (admin) ──────────────────────────────────────────────────────────────

export async function listEditRequests(filters: EditRequestFilterDto) {
  const { status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let base = db('profile_edit_requests as r')
    .join('candidates as e', 'e.id', 'r.candidate_id')
    .join('users as u', 'u.id', 'e.user_id');

  if (status) base = base.where('r.status', status);

  const [{ count }] = await base.clone().count('r.id as count');

  const rows = await base
    .clone()
    .select(
      'r.id',
      'r.status',
      'r.admin_note',
      'r.reason',
      'r.requested_data',
      'r.old_values',
      'r.created_at',
      'r.reviewed_at',
      'e.id as candidate_id',
      'e.first_name',
      'e.last_name',
      'e.profile_photo_url',
      'u.email',
    )
    .orderBy('r.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: Number(count),
      pages: Math.ceil(Number(count) / limit),
    },
  };
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getEditRequestById(id: string) {
  const row = await db('profile_edit_requests as r')
    .join('candidates as e', 'e.id', 'r.candidate_id')
    .join('users as u', 'u.id', 'e.user_id')
    .select(
      'r.id',
      'r.candidate_id',
      'r.requested_data',
      'r.old_values',
      'r.status',
      'r.admin_note',
      'r.reason',
      'r.created_at',
      'r.reviewed_at',
      'e.first_name',
      'e.last_name',
      'e.profile_photo_url',
      'u.email',
    )
    .where('r.id', id)
    .first();

  if (!row) throw new AppError(404, 'Edit request not found');
  return row;
}

// ── Get pending request for a specific candidate ───────────────────────────────

export async function getMyPendingRequest(userId: string) {
  const candidate = await db('candidates').where({ user_id: userId }).first();
  if (!candidate) throw new AppError(404, 'Candidate profile not found');

  const row = await db('profile_edit_requests')
    .where({ candidate_id: candidate.id })
    .orderBy('created_at', 'desc')
    .first();

  return row ?? null;
}

// ── Review (admin) ────────────────────────────────────────────────────────────

export async function reviewEditRequest(
  id: string,
  dto: ReviewEditRequestDto,
) {
  const request = await db('profile_edit_requests').where({ id }).first();
  if (!request) throw new AppError(404, 'Edit request not found');
  if (request.status !== 'pending') throw new AppError(409, 'Request has already been reviewed');

  await db('profile_edit_requests').where({ id }).update({
    status:      dto.status,
    admin_note:  dto.admin_note ?? null,
    reviewed_at: new Date(),
  });

  // Fetch candidate + user for email + profile_status update
  const candidate = await db('candidates as e')
    .join('users as u', 'u.id', 'e.user_id')
    .select('e.id', 'e.first_name', 'e.last_name', 'u.email')
    .where('e.id', request.candidate_id)
    .first();

  if (!candidate) throw new AppError(404, 'Candidate not found');

  if (dto.status === 'approved') {
    // Parse the stored requested_data and apply it to the candidate profile
    const requestedData = typeof request.requested_data === 'string'
      ? JSON.parse(request.requested_data)
      : request.requested_data;

    await updateCandidate(request.candidate_id, requestedData);

    // Reset status to active
    await db('candidates')
      .where({ id: request.candidate_id })
      .update({ profile_status: 'active', updated_at: new Date() });
  } else {
    // Rejected — reset status back to active
    await db('candidates')
      .where({ id: request.candidate_id })
      .update({ profile_status: 'active', updated_at: new Date() });
  }

  // Send email notification (non-fatal)
  sendEditRequestStatus(
    candidate.email,
    `${candidate.first_name} ${candidate.last_name}`,
    dto.status,
    dto.admin_note,
  ).catch(() => { /* non-fatal */ });

  return getEditRequestById(id);
}
