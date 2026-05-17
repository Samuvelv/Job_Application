// src/modules/edit-requests/edit-requests.service.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { updateCandidate, syncVolunteerAvailability } from '../candidates/candidates.service';
import { sendEditRequestStatus, sendAdminEditRequestNotification } from '../../services/email.service';
import type {
  SubmitEditRequestDto,
  ReviewEditRequestDto,
  BulkReviewEditRequestDto,
  EditRequestFilterDto,
} from './edit-requests.dto';
import { REQUEST_TYPE_GROUPS } from './edit-requests.dto';

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

  // Scalar/JSON columns that live directly on the candidates row
  Object.keys(requestedData).forEach(key => {
    if (key in candidateData) {
      oldValues[key] = candidateData[key];
    }
  });

  // Relation-table arrays: fetch old data from join tables when the candidate
  // is submitting changes for those fields, so admins see the true previous value.
  const relationKeys = new Set(Object.keys(requestedData));

  if (relationKeys.has('skills')) {
    const rows = await db('candidate_skills')
      .where({ candidate_id: candidate.id })
      .select('skill_name', 'proficiency')
      .orderBy('skill_name');
    oldValues['skills'] = rows;
  }

  if (relationKeys.has('languages')) {
    const rows = await db('candidate_languages')
      .where({ candidate_id: candidate.id })
      .select('language', 'proficiency')
      .orderBy('language');
    oldValues['languages'] = rows;
  }

  if (relationKeys.has('experience')) {
    const rows = await db('candidate_experience')
      .where({ candidate_id: candidate.id })
      .select('job_title', 'company_name', 'start_date', 'end_date', 'location', 'description', 'reason_for_leaving')
      .orderBy('start_date', 'desc');
    oldValues['experience'] = rows;
  }

  if (relationKeys.has('education')) {
    const rows = await db('candidate_education')
      .where({ candidate_id: candidate.id })
      .select('institution', 'degree', 'field_of_study', 'start_year', 'start_month', 'end_year', 'end_month', 'location')
      .orderBy('start_year', 'desc');
    oldValues['education'] = rows;
  }

  if (relationKeys.has('certificates')) {
    const rows = await db('candidate_certificates')
      .where({ candidate_id: candidate.id })
      .select('name', 'issuer', 'issue_date', 'expiry_date', 'no_expiry')
      .orderBy('issue_date', 'desc');
    oldValues['certificates'] = rows;
  }

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
  const { status, search, date_from, date_to, request_type, sort, page, limit } = filters;
  const offset = (page - 1) * limit;

  let base = db('profile_edit_requests as r')
    .join('candidates as e', 'e.id', 'r.candidate_id')
    .join('users as u', 'u.id', 'e.user_id');

  if (status) base = base.where('r.status', status);

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    base = base.whereRaw(`LOWER(e.first_name || ' ' || e.last_name) LIKE ?`, [term]);
  }

  if (date_from) {
    base = base.where('r.created_at', '>=', new Date(date_from));
  }

  if (date_to) {
    // Include the full day by going to end of the given date
    const to = new Date(date_to);
    to.setHours(23, 59, 59, 999);
    base = base.where('r.created_at', '<=', to);
  }

  if (request_type) {
    const keys = REQUEST_TYPE_GROUPS[request_type] ?? [];
    if (keys.length > 0) {
      // Match requests where requested_data contains at least one key from the group
      base = base.where(function () {
        keys.forEach((key) => {
          this.orWhereRaw(`r.requested_data::jsonb \\? ?`, [key]);
        });
      });
    }
  }

  const [{ count }] = await base.clone().count('r.id as count');

  const orderDir: 'asc' | 'desc' = sort === 'oldest' ? 'asc' : 'desc';

  const rows = await base
    .clone()
    .leftJoin('admins as a', 'a.user_id', 'r.reviewed_by_id')
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
      db.raw(`TRIM(a.first_name || ' ' || COALESCE(a.last_name, '')) as reviewed_by_name`),
    )
    .orderBy('r.created_at', orderDir)
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
    .leftJoin('admins as a', 'a.user_id', 'r.reviewed_by_id')
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
      db.raw(`TRIM(a.first_name || ' ' || COALESCE(a.last_name, '')) as reviewed_by_name`),
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
  adminUserId?: string,
) {
  const request = await db('profile_edit_requests').where({ id }).first();
  if (!request) throw new AppError(404, 'Edit request not found');
  if (request.status !== 'pending') throw new AppError(409, 'Request has already been reviewed');

  await db('profile_edit_requests').where({ id }).update({
    status:          dto.status,
    admin_note:      dto.admin_note ?? null,
    reviewed_at:     new Date(),
    reviewed_by_id:  adminUserId ?? null,
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

    // Strip problematic fields from certificates before passing to updateCandidate.
    // The edit-request form stores { id, file_url, ... } on each cert entry.
    // Passing `id` into a fresh INSERT causes a PK/unique constraint violation,
    // and `file_url` is not a writable column in this context.
    const { certificates, ...dataWithoutCerts } = requestedData;
    const cleanCerts = Array.isArray(certificates)
      ? certificates.map(({ id: _id, file_url: _fu, ...rest }: any) => rest)
      : undefined;
    const dataToApply = {
      ...dataWithoutCerts,
      ...(cleanCerts !== undefined ? { certificates: cleanCerts } : {}),
    };

    delete dataToApply.profile_status;
    await updateCandidate(request.candidate_id, dataToApply);

    // Reset status to active
    await db('candidates')
      .where({ id: request.candidate_id })
      .update({ profile_status: 'active', updated_at: new Date() });

    try {
      await syncVolunteerAvailability(request.candidate_id, 'active');
    } catch (syncErr) {
      console.error('[syncVolunteerAvailability] Failed after approved edit request review:', syncErr);
    }
  } else {
    // Rejected — reset status back to active
    await db('candidates')
      .where({ id: request.candidate_id })
      .update({ profile_status: 'active', updated_at: new Date() });

    try {
      await syncVolunteerAvailability(request.candidate_id, 'active');
    } catch (syncErr) {
      console.error('[syncVolunteerAvailability] Failed after rejected edit request review:', syncErr);
    }
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

// ── Counts (admin) ───────────────────────────────────────────────────────────

export async function getEditRequestCounts() {
  const rows = await db('profile_edit_requests')
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

export async function bulkReviewEditRequests(dto: BulkReviewEditRequestDto, adminUserId?: string) {
  const succeeded: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const id of dto.ids) {
    try {
      await reviewEditRequest(id, { status: dto.status, admin_note: dto.admin_note }, adminUserId);
      succeeded.push(id);
    } catch (err: any) {
      failed.push({ id, reason: err?.message ?? 'Unknown error' });
    }
  }

  return { succeeded, failed };
}

// ── Export CSV (admin) ────────────────────────────────────────────────────────

export async function exportEditRequests(filters: Omit<EditRequestFilterDto, 'page' | 'limit'>) {
  const { status, search, date_from, date_to, request_type, sort } = filters;

  let base = db('profile_edit_requests as r')
    .join('candidates as e', 'e.id', 'r.candidate_id')
    .join('users as u', 'u.id', 'e.user_id')
    .leftJoin('admins as a', 'a.user_id', 'r.reviewed_by_id');

  if (status) base = base.where('r.status', status);
  if (search) {
    const term = `%${search.toLowerCase()}%`;
    base = base.whereRaw(`LOWER(e.first_name || ' ' || e.last_name) LIKE ?`, [term]);
  }
  if (date_from) base = base.where('r.created_at', '>=', new Date(date_from));
  if (date_to) {
    const to = new Date(date_to);
    to.setHours(23, 59, 59, 999);
    base = base.where('r.created_at', '<=', to);
  }
  if (request_type) {
    const keys = REQUEST_TYPE_GROUPS[request_type] ?? [];
    if (keys.length > 0) {
      base = base.where(function (this: any) {
        keys.forEach((key) => { this.orWhereRaw(`r.requested_data::jsonb \\? ?`, [key]); });
      });
    }
  }

  const orderDir: 'asc' | 'desc' = sort === 'oldest' ? 'asc' : 'desc';

  const rows = await base
    .select(
      'r.id', 'r.status', 'r.reason', 'r.created_at', 'r.reviewed_at',
      'r.old_values', 'r.requested_data',
      'e.first_name', 'e.last_name',
      db.raw(`TRIM(a.first_name || ' ' || COALESCE(a.last_name, '')) as reviewed_by_name`),
    )
    .orderBy('r.created_at', orderDir);

  const escape  = (v: unknown) => { const s = String(v ?? '').replace(/"/g, '""'); return `"${s}"`; };
  const fmtDate = (v: unknown) => v ? new Date(String(v)).toISOString().split('T')[0] : '';

  // Flatten a JSON object to "key: value; key: value" string
  const flattenJson = (raw: unknown): string => {
    if (!raw) return '';
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => {
          const label = k.replace(/_/g, ' ');
          const val   = Array.isArray(v) ? v.join(', ') : String(v ?? '');
          return `${label}: ${val}`;
        })
        .join('; ');
    } catch {
      return String(raw);
    }
  };

  const headers = [
    'Request ID', 'Candidate Name', 'Request Type',
    'Old Value', 'New Value',
    'Status', 'Date Submitted', 'Admin Decision Date',
  ];

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r: any) => [
      r.id,
      `${r.first_name} ${r.last_name}`,
      r.reason ?? '',
      flattenJson(r.old_values),
      flattenJson(r.requested_data),
      r.status,
      fmtDate(r.created_at),
      fmtDate(r.reviewed_at),
    ].map(escape).join(',')),
  ];
  return lines.join('\n');
}
