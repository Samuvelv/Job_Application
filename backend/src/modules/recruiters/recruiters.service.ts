// src/modules/recruiters/recruiters.service.ts
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { revokeRecruiterToken } from '../../services/token.service';
import { sendRecruiterCredentials } from '../../services/email.service';
import type { CreateRecruiterDto, UpdateRecruiterDto, RecruiterFilterDto } from './recruiters.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyRecruiterSortOrder(query: any, sortBy: string): any {
  switch (sortBy) {
    case 'oldest':       return query.orderBy('r.created_at', 'asc');
    case 'most_active':  return query.orderBy('shortlists_count', 'desc').orderBy('contact_requests_count', 'desc');
    case 'alphabetical': return query.orderBy('r.contact_name', 'asc');
    case 'last_active':  return query.orderByRaw('last_login_at DESC NULLS LAST').orderBy('r.created_at', 'desc');
    default:             return query.orderBy('r.created_at', 'desc'); // newest
  }
}

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
      is_active:     dto.is_active ?? true,
    });

    // Generate recruiter number from sequence
    const [{ nextval: seqVal }] = await trx.raw(`SELECT nextval('recruiters_seq')`).then((r: any) => r.rows);
    const recruiterNumber = `REC-${String(seqVal).padStart(4, '0')}`;

    await trx('recruiters').insert({
      id:               recruiterId,
      user_id:          userId,
      recruiter_number: recruiterNumber,
      contact_name:     dto.contact_name,
      contact_job_title: dto.contact_job_title ?? null,
      company_name:     dto.company_name ?? null,
      company_country:  dto.company_country ?? null,
      company_city:     dto.company_city ?? null,
      company_website:  dto.company_website ?? null,
      industry:         dto.industry ?? null,
      phone:            dto.phone ?? null,
      has_sponsor_licence:       dto.has_sponsor_licence ?? null,
      sponsor_licence_number:    dto.sponsor_licence_number ?? null,
      sponsor_licence_countries: dto.sponsor_licence_countries ?? null,
      target_nationalities:      dto.target_nationalities ?? null,
      hires_per_year:   dto.hires_per_year ?? null,
      admin_notes:      dto.admin_notes ?? null,
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

// ── Filter builder (shared by list + export) ─────────────────────────────────

function buildApplyFilters(filters: RecruiterFilterDto) {
  return (b: any) => {
    const { search, company, isActive, companyCountry, industry,
            hasSponsorLicence, sponsorCountry, accountStatus,
            joinedFrom, joinedTo, lastActive } = filters;

    if (search) {
      b.where((inner: any) =>
        inner.whereILike('r.contact_name', `%${search}%`)
             .orWhereILike('r.company_name', `%${search}%`)
             .orWhereILike('u.email', `%${search}%`),
      );
    }
    if (company) b.whereILike('r.company_name', `%${company}%`);

    if (isActive !== undefined && !accountStatus) {
      b.where('u.is_active', isActive === 'true');
    }

    if (companyCountry) b.whereILike('r.company_country', `%${companyCountry}%`);

    if (industry) {
      const list = industry.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (list.length === 1) b.whereILike('r.industry', `%${list[0]}%`);
      else b.where((inner: any) => { list.forEach((i: string) => inner.orWhereILike('r.industry', `%${i}%`)); });
    }

    if (hasSponsorLicence) b.where('r.has_sponsor_licence', hasSponsorLicence);

    if (sponsorCountry) {
      const countries = sponsorCountry.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (countries.length) {
        b.whereRaw(`r.sponsor_licence_countries && ?::text[]`, [countries]);
      }
    }

    if (accountStatus) {
      if (accountStatus === 'active')   b.where('u.is_active', true).where('r.access_expires_at', '>', db.fn.now());
      if (accountStatus === 'inactive') b.where('u.is_active', false);
      if (accountStatus === 'expired')  b.where('r.access_expires_at', '<=', db.fn.now());
    }

    if (joinedFrom) b.where('r.created_at', '>=', new Date(joinedFrom));
    if (joinedTo) {
      const to = new Date(joinedTo);
      to.setDate(to.getDate() + 1);
      b.where('r.created_at', '<', to);
    }

    if (lastActive) {
      const days = lastActive === '7_days' ? 7 : lastActive === '30_days' ? 30 : 90;
      b.whereExists(
        db('recruiter_access_tokens as rat')
          .whereRaw('rat.recruiter_id = r.id')
          .where('rat.created_at', '>=', db.raw(`NOW() - INTERVAL '${days} days'`))
          .select(db.raw('1')),
      );
    }
  };
}

// ── List recruiters ───────────────────────────────────────────────────────────

export async function listRecruiters(filters: RecruiterFilterDto) {
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  const applyFilters = buildApplyFilters(filters);

  let query = db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select(
      'r.id',
      'r.recruiter_number',
      'r.user_id',
      'u.email',
      'r.contact_name',
      'r.contact_job_title',
      'r.company_name',
      'r.company_logo_url',
      'r.company_country',
      'r.industry',
      'r.has_sponsor_licence',
      'r.sponsor_licence_countries',
      'r.access_expires_at',
      'r.plain_password',
      'u.is_active',
      'r.created_at',
      db.raw(`(SELECT COUNT(*)::int FROM shortlists s WHERE s.recruiter_id = r.id) AS shortlists_count`),
      db.raw(`(SELECT COUNT(*)::int FROM contact_unlock_requests cur WHERE cur.recruiter_id = r.id) AS contact_requests_count`),
      db.raw(`(SELECT COUNT(*)::int FROM profile_views pv WHERE pv.recruiter_id = r.id) AS profiles_viewed_count`),
      db.raw(`(SELECT MAX(rat.created_at) FROM recruiter_access_tokens rat WHERE rat.recruiter_id = r.id) AS last_login_at`),
    )
    .modify(applyFilters);

  const [{ count }] = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .modify(applyFilters)
    .count('r.id as count');

  const data = await applyRecruiterSortOrder(query, filters.sortBy).limit(limit).offset(offset);

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

// ── Export / CSV ──────────────────────────────────────────────────────────────
// Schema verified (migration 20240014):
//   contact_unlock_requests.recruiter_id → FK to recruiters.id  ✓
//   shortlists.recruiter_id              → FK to recruiters.id  ✓
// plain_password is intentionally excluded — sensitive field must never appear in exports.

export async function exportRecruiters(filters: RecruiterFilterDto) {
  debugger
  const rows = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select(
      // --- identity ---
      'r.id',           // required as correlated-subquery anchor; stripped before return
      'r.recruiter_number',
      'r.contact_name',
      'r.company_name',
      'u.email',
      // --- profile (added by migration 20240021) ---
      'r.company_country',
      'r.industry',
      // --- status ---
      'u.is_active',
      'r.access_expires_at',
      'r.created_at',
      // --- activity counts (correlated subqueries; recruiter_id verified in each table) ---
      db.raw(
        `(SELECT COUNT(*)::int FROM shortlists s
          WHERE s.recruiter_id = r.id) AS shortlists_count`,
      ),
      db.raw(
        `(SELECT COUNT(*)::int FROM contact_unlock_requests cur
          WHERE cur.recruiter_id = r.id) AS unlock_requests_count`,
      ),
    )
    .modify(buildApplyFilters(filters))
    .orderBy('r.created_at', 'desc')
    .limit(10000);

  // Strip the internal anchor column before returning to the controller
  return rows.map(({ id: _id, ...rest }: any) => rest);
}

// ── Bulk operations ───────────────────────────────────────────────────────────

export async function bulkUpdateStatus(ids: string[], isActive: boolean): Promise<{ updated: number }> {
  debugger
  if (!ids.length) return { updated: 0 };
  const updated = await db('users')
    .whereIn('id', db('recruiters').select('user_id').whereIn('id', ids))
    .update({ is_active: isActive });
  return { updated };
}

export async function exportSelectedRecruiters(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db('recruiters as r')
    .join('users as u', 'u.id', 'r.user_id')
    .select(
      'r.id',
      'r.recruiter_number',
      'r.contact_name',
      'r.company_name',
      'u.email',
      'r.company_country',
      'r.industry',
      'u.is_active',
      'r.access_expires_at',
      'r.created_at',
      db.raw(`(SELECT COUNT(*)::int FROM shortlists s WHERE s.recruiter_id = r.id) AS shortlists_count`),
      db.raw(`(SELECT COUNT(*)::int FROM contact_unlock_requests cur WHERE cur.recruiter_id = r.id) AS unlock_requests_count`),
    )
    .whereIn('r.id', ids)
    .orderBy('r.created_at', 'desc');
  return rows.map(({ id: _id, ...rest }: any) => rest);
}

// ── Get single recruiter ──────────────────────────────────────────────────────

export async function updateRecruiter(id: string, dto: UpdateRecruiterDto) {
  const existing = await getRecruiterById(id); // throws 404 if not found
  const patch: Record<string, unknown> = {};
  if (dto.contact_name       !== undefined) patch['contact_name']      = dto.contact_name;
  if (dto.contact_job_title  !== undefined) patch['contact_job_title'] = dto.contact_job_title ?? null;
  if (dto.company_name       !== undefined) patch['company_name']      = dto.company_name ?? null;
  if (dto.company_country    !== undefined) patch['company_country']   = dto.company_country ?? null;
  if (dto.company_city       !== undefined) patch['company_city']      = dto.company_city ?? null;
  if (dto.company_website    !== undefined) patch['company_website']   = dto.company_website ?? null;
  if (dto.industry           !== undefined) patch['industry']          = dto.industry ?? null;
  if (dto.phone              !== undefined) patch['phone']             = dto.phone ?? null;
  if (dto.has_sponsor_licence       !== undefined) patch['has_sponsor_licence']       = dto.has_sponsor_licence ?? null;
  if (dto.sponsor_licence_number    !== undefined) patch['sponsor_licence_number']    = dto.sponsor_licence_number ?? null;
  if (dto.sponsor_licence_countries !== undefined) patch['sponsor_licence_countries'] = dto.sponsor_licence_countries ?? null;
  if (dto.target_nationalities      !== undefined) patch['target_nationalities']      = dto.target_nationalities ?? null;
  if (dto.hires_per_year     !== undefined) patch['hires_per_year']    = dto.hires_per_year ?? null;
  if (dto.admin_notes        !== undefined) patch['admin_notes']       = dto.admin_notes ?? null;
  if (dto.access_expires_at  !== undefined) patch['access_expires_at'] = new Date(dto.access_expires_at);

  // Handle email change
  if (dto.email !== undefined) {
    const emailTaken = await db('users')
      .where({ email: dto.email.toLowerCase() })
      .whereNot({ id: existing.user_id })
      .first();
    if (emailTaken) throw new AppError(409, 'Email is already registered');
    await db('users').where({ id: existing.user_id }).update({ email: dto.email.toLowerCase() });
  }

  // Handle password change
  if (dto.new_password) {
    const hash = await bcrypt.hash(dto.new_password, 12);
    await db('users').where({ id: existing.user_id }).update({ password_hash: hash });
    patch['plain_password'] = dto.new_password;
  }

  // Handle active toggle (stored on users table)
  if (dto.is_active !== undefined) {
    await db('users').where({ id: existing.user_id }).update({ is_active: dto.is_active });
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
      'r.contact_job_title',
      'r.company_name',
      'r.company_logo_url',
      'r.company_country',
      'r.company_city',
      'r.company_website',
      'r.industry',
      'r.phone',
      'r.has_sponsor_licence',
      'r.sponsor_licence_number',
      'r.sponsor_licence_countries',
      'r.target_nationalities',
      'r.hires_per_year',
      'r.admin_notes',
      'r.access_expires_at',
      'r.plain_password',
      'u.is_active',
      'r.created_at',
      db.raw(`(SELECT COUNT(*)::int FROM shortlists s WHERE s.recruiter_id = r.id) AS shortlists_count`),
      db.raw(`(SELECT COUNT(*)::int FROM contact_unlock_requests cur WHERE cur.recruiter_id = r.id) AS contact_requests_count`),
      db.raw(`(SELECT MAX(rat.created_at) FROM recruiter_access_tokens rat WHERE rat.recruiter_id = r.id) AS last_login_at`),
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
