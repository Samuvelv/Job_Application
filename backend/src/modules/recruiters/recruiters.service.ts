// src/modules/recruiters/recruiters.service.ts
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { issueRecruiterAccessToken, revokeRecruiterToken } from '../../services/token.service';
import { sendRecruiterAccessLink } from '../../services/email.service';
import type { CreateRecruiterDto, GenerateTokenDto, RecruiterFilterDto } from './recruiters.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRoleId(roleName: string): Promise<number> {
  const role = await db('roles').where({ name: roleName }).first();
  if (!role) throw new AppError(500, `Role "${roleName}" not found. Run seeds first.`);
  return role.id;
}

async function fetchActiveToken(recruiterId: string) {
  return db('recruiter_access_tokens')
    .where({ recruiter_id: recruiterId, revoked: false })
    .where('expires_at', '>', new Date())
    .orderBy('created_at', 'desc')
    .first();
}

// ── Create recruiter ──────────────────────────────────────────────────────────

export async function createRecruiter(dto: CreateRecruiterDto, createdByAdminId: string) {
  const existing = await db('users').where({ email: dto.email.toLowerCase() }).first();
  if (existing) throw new AppError(409, 'Email is already registered');

  const recruiterRoleId = await getRoleId('recruiter');

  // Recruiters don't use a password for portal access (token-based), but we
  // still need a user row for JWT subject. Use a locked random hash.
  const passwordHash = await bcrypt.hash('recruiter@123', 12);
  const userId       = uuidv4();
  const recruiterId  = uuidv4();

  const accessExpiresAt = new Date(Date.now() + dto.access_duration_seconds * 1000);

  await db.transaction(async (trx) => {
    await trx('users').insert({
      id:            userId,
      email:         dto.email.toLowerCase(),
      password_hash: passwordHash,
      role_id:       recruiterRoleId,
      is_active:     true,
    });

    await trx('recruiters').insert({
      id:                recruiterId,
      user_id:           userId,
      company_name:      dto.company_name   ?? null,
      contact_name:      dto.contact_name,
      created_by:        createdByAdminId,
      access_expires_at: accessExpiresAt,
    });
  });

  // Issue initial access token
  const token = await issueRecruiterAccessToken(recruiterId, dto.access_duration_seconds);

  if (dto.send_email) {
    await sendRecruiterAccessLink(
      dto.email.toLowerCase(),
      dto.contact_name,
      token,
      accessExpiresAt,
    ).catch(() => { /* non-fatal */ });
  }

  const recruiter = await getRecruiterById(recruiterId);
  return { recruiter, token };
}

// ── List recruiters ───────────────────────────────────────────────────────────

export async function listRecruiters(filters: RecruiterFilterDto) {
  const { search, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select(
      'r.id',
      'r.user_id',
      'u.email',
      'r.contact_name',
      'r.company_name',
      'r.access_expires_at',
      'u.is_active',
      'r.created_at',
    );

  if (search) {
    query = query.where((b) =>
      b.whereILike('r.contact_name', `%${search}%`)
       .orWhereILike('r.company_name', `%${search}%`)
       .orWhereILike('u.email', `%${search}%`),
    );
  }

  const [{ count }] = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .modify((b) => {
      if (search) {
        b.where((inner) =>
          inner.whereILike('r.contact_name', `%${search}%`)
               .orWhereILike('r.company_name', `%${search}%`)
               .orWhereILike('u.email', `%${search}%`),
        );
      }
    })
    .count('r.id as count');

  const data = await query.orderBy('r.created_at', 'desc').limit(limit).offset(offset);

  return {
    data,
    pagination: {
      page,
      limit,
      total: Number(count),
      pages: Math.ceil(Number(count) / limit),
    },
  };
}

// ── Get single recruiter ──────────────────────────────────────────────────────

export async function getRecruiterById(id: string) {
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select(
      'r.id',
      'r.user_id',
      'u.email',
      'r.contact_name',
      'r.company_name',
      'r.access_expires_at',
      'u.is_active',
      'r.created_at',
    )
    .where('r.id', id)
    .first();

  if (!recruiter) throw new AppError(404, 'Recruiter not found');

  const activeToken = await fetchActiveToken(id);
  return { ...recruiter, has_active_token: !!activeToken, token_expires_at: activeToken?.expires_at ?? null };
}

export async function getRecruiterByUserId(userId: string) {
  const recruiter = await db('recruiters').where({ user_id: userId }).first();
  if (!recruiter) throw new AppError(404, 'Recruiter record not found');
  return recruiter;
}

// ── Delete recruiter ──────────────────────────────────────────────────────────

export async function deleteRecruiter(id: string) {
  const recruiter = await db('recruiters').where({ id }).first();
  if (!recruiter) throw new AppError(404, 'Recruiter not found');

  await revokeRecruiterToken(id);
  // cascade deletes recruiter + shortlists; user row also cascades
  await db('users').where({ id: recruiter.user_id }).delete();
}

// ── Generate / revoke token ───────────────────────────────────────────────────

export async function generateToken(recruiterId: string, dto: GenerateTokenDto): Promise<string> {
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.id', 'r.contact_name', 'u.email', 'r.access_expires_at')
    .where('r.id', recruiterId)
    .first();
  if (!recruiter) throw new AppError(404, 'Recruiter not found');

  // Revoke old tokens first
  await revokeRecruiterToken(recruiterId);

  // Update the access_expires_at on the recruiter record
  const newExpiresAt = new Date(Date.now() + dto.access_duration_seconds * 1000);
  await db('recruiters').where({ id: recruiterId }).update({ access_expires_at: newExpiresAt });

  const token = await issueRecruiterAccessToken(recruiterId, dto.access_duration_seconds);

  if (dto.send_email) {
    await sendRecruiterAccessLink(
      recruiter.email,
      recruiter.contact_name,
      token,
      newExpiresAt,
    ).catch(() => { /* non-fatal */ });
  }

  return token;
}

export async function revokeToken(recruiterId: string): Promise<void> {
  const exists = await db('recruiters').where({ id: recruiterId }).first();
  if (!exists) throw new AppError(404, 'Recruiter not found');
  await revokeRecruiterToken(recruiterId);
}

// ── Shortlist ─────────────────────────────────────────────────────────────────

export async function getShortlist(recruiterId: string) {
  return db('shortlists as s')
    .join('employees as e', 'e.id', 's.employee_id')
    .join('users as u', 'u.id', 'e.user_id')
    .select(
      's.id as shortlist_id',
      's.notes',
      's.created_at as shortlisted_at',
      'e.id as employee_id',
      'e.first_name',
      'e.last_name',
      'e.job_title',
      'e.occupation',
      'e.industry',
      'e.current_city',
      'e.current_country',
      'e.years_experience',
      'e.profile_photo_url',
      'u.email',
    )
    .where('s.recruiter_id', recruiterId)
    .orderBy('s.created_at', 'desc');
}

export async function addToShortlist(recruiterId: string, employeeId: string, notes?: string) {
  const employee = await db('employees').where({ id: employeeId }).first();
  if (!employee) throw new AppError(404, 'Employee not found');

  const existing = await db('shortlists').where({ recruiter_id: recruiterId, employee_id: employeeId }).first();
  if (existing) throw new AppError(409, 'Already shortlisted');

  const id = uuidv4();
  await db('shortlists').insert({ id, recruiter_id: recruiterId, employee_id: employeeId, notes: notes ?? null });
  return { id, recruiter_id: recruiterId, employee_id: employeeId, notes };
}

export async function removeFromShortlist(recruiterId: string, employeeId: string) {
  const deleted = await db('shortlists')
    .where({ recruiter_id: recruiterId, employee_id: employeeId })
    .delete();
  if (!deleted) throw new AppError(404, 'Shortlist entry not found');
}
