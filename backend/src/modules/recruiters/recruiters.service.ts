// src/modules/recruiters/recruiters.service.ts
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { revokeRecruiterToken } from '../../services/token.service';
import { sendRecruiterCredentials } from '../../services/email.service';
import type { CreateRecruiterDto, UpdateRecruiterDto, RecruiterFilterDto } from './recruiters.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRoleId(roleName: string): Promise<number> {
  const role = await db('roles').where({ name: roleName }).first();
  if (!role) throw new AppError(500, `Role "${roleName}" not found. Run seeds first.`);
  return role.id;
}

// ── Create recruiter ──────────────────────────────────────────────────────────

export async function createRecruiter(dto: CreateRecruiterDto, createdByAdminId: string) {
  const existing = await db('users').where({ email: dto.email.toLowerCase() }).first();
  if (existing) throw new AppError(409, 'Email is already registered');

  const recruiterRoleId = await getRoleId('recruiter');

  const passwordHash = await bcrypt.hash(dto.password, 12);

  const userId      = uuidv4();
  const recruiterId = uuidv4();

  await db.transaction(async (trx) => {
    await trx('users').insert({
      id:            userId,
      email:         dto.email.toLowerCase(),
      password_hash: passwordHash,
      role_id:       recruiterRoleId,
      is_active:     true,
    });

    // Generate recruiter number from sequence
    const [{ nextval: seqVal }] = await trx.raw(`SELECT nextval('recruiters_seq')`).then((r: any) => r.rows);
    const recruiterNumber = `REC-${String(seqVal).padStart(4, '0')}`;

    await trx('recruiters').insert({
      id:               recruiterId,
      user_id:          userId,
      recruiter_number: recruiterNumber,
      company_name:     dto.company_name ?? null,
      contact_name:     dto.contact_name,
      created_by:       createdByAdminId,
      plain_password:   dto.password,
      access_expires_at: new Date(dto.access_expires_at),
    });
  });

  // Send credentials email (non-blocking)
  sendRecruiterCredentials(dto.email.toLowerCase(), dto.contact_name, dto.password)
    .catch((err) => console.error('[EMAIL] Failed to send recruiter credentials:', err));

  const recruiter = await getRecruiterById(recruiterId);
  return { recruiter };
}

// ── List recruiters ───────────────────────────────────────────────────────────

export async function listRecruiters(filters: RecruiterFilterDto) {
  const { search, company, isActive, page, limit } = filters;
  const offset = (page - 1) * limit;

  const applyFilters = (b: any) => {
    if (search) {
      b.where((inner: any) =>
        inner.whereILike('r.contact_name', `%${search}%`)
             .orWhereILike('r.company_name', `%${search}%`)
             .orWhereILike('u.email', `%${search}%`),
      );
    }
    if (company) b.whereILike('r.company_name', `%${company}%`);
    if (isActive !== undefined) b.where('u.is_active', isActive === 'true');
  };

  let query = db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select(
      'r.id',
      'r.recruiter_number',
      'r.user_id',
      'u.email',
      'r.contact_name',
      'r.company_name',
      'r.access_expires_at',
      'r.plain_password',
      'u.is_active',
      'r.created_at',
    )
    .modify(applyFilters);

  const [{ count }] = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .modify(applyFilters)
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

export async function updateRecruiter(id: string, dto: UpdateRecruiterDto) {
  const existing = await getRecruiterById(id); // throws 404 if not found
  const patch: Record<string, unknown> = {};
  if (dto.contact_name      !== undefined) patch['contact_name']      = dto.contact_name;
  if (dto.company_name      !== undefined) patch['company_name']      = dto.company_name ?? null;
  if (dto.access_expires_at !== undefined) patch['access_expires_at'] = new Date(dto.access_expires_at);

  // Handle password change
  if (dto.new_password) {
    const hash = await bcrypt.hash(dto.new_password, 12);
    await db('users').where({ id: existing.user_id }).update({ password_hash: hash });
    patch['plain_password'] = dto.new_password;
  }

  if (Object.keys(patch).length > 0) {
    await db('recruiters').where({ id }).update({ ...patch });
  }
  return getRecruiterById(id);
}

export async function getRecruiterById(id: string) {
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select(
      'r.id',
      'r.recruiter_number',
      'r.user_id',
      'u.email',
      'r.contact_name',
      'r.company_name',
      'r.access_expires_at',
      'r.plain_password',
      'u.is_active',
      'r.created_at',
    )
    .where('r.id', id)
    .first();

  if (!recruiter) throw new AppError(404, 'Recruiter not found');

  return recruiter;
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

// ── Resend credentials ────────────────────────────────────────────────────────

export async function resendCredentials(recruiterId: string): Promise<void> {
  const recruiter = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select('r.id', 'r.contact_name', 'r.plain_password', 'u.email')
    .where('r.id', recruiterId)
    .first();
  if (!recruiter) throw new AppError(404, 'Recruiter not found');
  if (!recruiter.plain_password) throw new AppError(400, 'No stored password for this recruiter. Please set a new password via the edit panel first.');

  sendRecruiterCredentials(recruiter.email, recruiter.contact_name, recruiter.plain_password)
    .catch((err) => console.error('[EMAIL] Failed to resend recruiter credentials:', err));
}

// ── Shortlist ─────────────────────────────────────────────────────────────────

export async function getShortlist(recruiterId: string) {
  return db('shortlists as s')
    .join('candidates as e', 'e.id', 's.candidate_id')
    .join('users as u', 'u.id', 'e.user_id')
    .select(
      's.id as shortlist_id',
      's.notes',
      's.created_at as shortlisted_at',
      'e.id as candidate_id',
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

export async function addToShortlist(recruiterId: string, candidateId: string, notes?: string) {
  const candidate = await db('candidates').where({ id: candidateId }).first();
  if (!candidate) throw new AppError(404, 'Candidate not found');

  const existing = await db('shortlists').where({ recruiter_id: recruiterId, candidate_id: candidateId }).first();
  if (existing) throw new AppError(409, 'Already shortlisted');

  const id = uuidv4();
  await db('shortlists').insert({ id, recruiter_id: recruiterId, candidate_id: candidateId, notes: notes ?? null });
  return { id, recruiter_id: recruiterId, candidate_id: candidateId, notes };
}

export async function removeFromShortlist(recruiterId: string, candidateId: string) {
  const deleted = await db('shortlists')
    .where({ recruiter_id: recruiterId, candidate_id: candidateId })
    .delete();
  if (!deleted) throw new AppError(404, 'Shortlist entry not found');
}
