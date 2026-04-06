// src/modules/edit-requests/edit-requests.service.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { updateEmployee } from '../employees/employees.service';
import { sendEditRequestStatus } from '../../services/email.service';
import type {
  SubmitEditRequestDto,
  ReviewEditRequestDto,
  EditRequestFilterDto,
} from './edit-requests.dto';

// ── Submit (employee) ─────────────────────────────────────────────────────────

export async function submitEditRequest(
  userId: string,
  dto: SubmitEditRequestDto,
) {
  // Resolve employee from user
  const employee = await db('employees as e')
    .join('users as u', 'u.id', 'e.user_id')
    .select('e.id', 'e.first_name', 'e.last_name', 'u.email')
    .where('e.user_id', userId)
    .first();
  if (!employee) throw new AppError(404, 'Employee profile not found');

  // Block if there is already an open pending request
  const existing = await db('profile_edit_requests')
    .where({ employee_id: employee.id, status: 'pending' })
    .first();
  if (existing) throw new AppError(409, 'You already have a pending edit request');

  const id = uuidv4();
  await db('profile_edit_requests').insert({
    id,
    employee_id:    employee.id,
    requested_data: JSON.stringify(dto),
    status:         'pending',
  });

  // Mark profile as pending_edit
  await db('employees')
    .where({ id: employee.id })
    .update({ profile_status: 'pending_edit', updated_at: new Date() });

  return getEditRequestById(id);
}

// ── List (admin) ──────────────────────────────────────────────────────────────

export async function listEditRequests(filters: EditRequestFilterDto) {
  const { status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let base = db('profile_edit_requests as r')
    .join('employees as e', 'e.id', 'r.employee_id')
    .join('users as u', 'u.id', 'e.user_id');

  if (status) base = base.where('r.status', status);

  const [{ count }] = await base.clone().count('r.id as count');

  const rows = await base
    .clone()
    .select(
      'r.id',
      'r.status',
      'r.admin_note',
      'r.created_at',
      'r.reviewed_at',
      'e.id as employee_id',
      'e.first_name',
      'e.last_name',
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
    .join('employees as e', 'e.id', 'r.employee_id')
    .join('users as u', 'u.id', 'e.user_id')
    .select(
      'r.id',
      'r.employee_id',
      'r.requested_data',
      'r.status',
      'r.admin_note',
      'r.created_at',
      'r.reviewed_at',
      'e.first_name',
      'e.last_name',
      'u.email',
    )
    .where('r.id', id)
    .first();

  if (!row) throw new AppError(404, 'Edit request not found');
  return row;
}

// ── Get pending request for a specific employee ───────────────────────────────

export async function getMyPendingRequest(userId: string) {
  const employee = await db('employees').where({ user_id: userId }).first();
  if (!employee) throw new AppError(404, 'Employee profile not found');

  const row = await db('profile_edit_requests')
    .where({ employee_id: employee.id })
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

  // Fetch employee + user for email + profile_status update
  const employee = await db('employees as e')
    .join('users as u', 'u.id', 'e.user_id')
    .select('e.id', 'e.first_name', 'e.last_name', 'u.email')
    .where('e.id', request.employee_id)
    .first();

  if (!employee) throw new AppError(404, 'Employee not found');

  if (dto.status === 'approved') {
    // Parse the stored requested_data and apply it to the employee profile
    const requestedData = typeof request.requested_data === 'string'
      ? JSON.parse(request.requested_data)
      : request.requested_data;

    await updateEmployee(request.employee_id, requestedData);

    // Reset status to active
    await db('employees')
      .where({ id: request.employee_id })
      .update({ profile_status: 'active', updated_at: new Date() });
  } else {
    // Rejected — reset status back to active
    await db('employees')
      .where({ id: request.employee_id })
      .update({ profile_status: 'active', updated_at: new Date() });
  }

  // Send email notification (non-fatal)
  sendEditRequestStatus(
    employee.email,
    `${employee.first_name} ${employee.last_name}`,
    dto.status,
    dto.admin_note,
  ).catch(() => { /* non-fatal */ });

  return getEditRequestById(id);
}
