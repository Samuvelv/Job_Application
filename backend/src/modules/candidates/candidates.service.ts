// src/modules/candidates/candidates.service.ts
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { sendCandidateCredentials } from '../../services/email.service';
import type { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './candidates.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRoleId(roleName: string): Promise<number> {
  const role = await db('roles').where({ name: roleName }).first();
  if (!role) throw new AppError(500, `Role "${roleName}" not found. Run seeds first.`);
  return role.id;
}

async function fetchRelations(candidateId: string) {
  const [skills, languages, experience, education, certificates] = await Promise.all([
    db('candidate_skills').where({ candidate_id: candidateId }),
    db('candidate_languages').where({ candidate_id: candidateId }),
    db('candidate_experience').where({ candidate_id: candidateId }).orderBy('start_date', 'desc'),
    db('candidate_education').where({ candidate_id: candidateId }).orderBy('start_year', 'desc'),
    db('candidate_certificates').where({ candidate_id: candidateId }),
  ]);
  return { skills, languages, experience, education, certificates };
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createCandidate(dto: CreateCandidateDto, createdByAdminId: string) {
  // Check email uniqueness
  const existing = await db('users').where({ email: dto.email.toLowerCase() }).first();
  if (existing) throw new AppError(409, 'Email is already registered');

  const candidateRoleId = await getRoleId('candidate');
  const passwordHash   = await bcrypt.hash(dto.password, 12);
  const userId         = uuidv4();
  const candidateId     = uuidv4();

  await db.transaction(async (trx) => {
    // 1. Create user account
    await trx('users').insert({
      id:            userId,
      email:         dto.email.toLowerCase(),
      password_hash: passwordHash,
      role_id:       candidateRoleId,
      is_active:     true,
    });

    // 2. Generate candidate number from sequence
    const [{ nextval: seqVal }] = await trx.raw(`SELECT nextval('candidates_seq')`).then((r: any) => r.rows);
    const candidateNumber = `CAND-${String(seqVal).padStart(4, '0')}`;

    // 3. Create candidate profile
    await trx('candidates').insert({
      id:               candidateId,
      user_id:          userId,
      candidate_number: candidateNumber,
      first_name:       dto.first_name,
      last_name:        dto.last_name,
      date_of_birth:    dto.date_of_birth    ?? null,
      gender:           dto.gender           ?? null,
      phone:            dto.phone            ?? null,
      bio:              dto.bio              ?? null,
      job_title:        dto.job_title        ?? null,
      occupation:       dto.occupation       ?? null,
      industry:         dto.industry         ?? null,
      years_experience: dto.years_experience ?? null,
      linkedin_url:     dto.linkedin_url     ?? null,
      current_country:  dto.current_country  ?? null,
      current_city:     dto.current_city     ?? null,
      nationality:      dto.nationality      ?? null,
      postal_code:      dto.postal_code      ?? null,
      target_locations: dto.target_locations ?? null,
      hobbies:          dto.hobbies          ?? [],
      salary_min:      dto.salary_min      ?? null,
      salary_max:      dto.salary_max      ?? null,
      salary_currency: dto.salary_currency ?? null,
      salary_type:     dto.salary_type     ?? null,
      notice_period_id:        dto.notice_period_id ?? null,
      profile_status:          'active',
      registration_fee_status: dto.registration_fee_status ?? 'pending_payment',
      cv_format:               dto.cv_format               ?? 'not_yet_created',
      plain_password:          dto.password,
    });

    // 3. Insert related arrays
    if (dto.skills?.length) {
      await trx('candidate_skills').insert(
        dto.skills.map((s) => ({ candidate_id: candidateId, ...s })),
      );
    }
    if (dto.languages?.length) {
      await trx('candidate_languages').insert(
        dto.languages.map((l) => ({ candidate_id: candidateId, ...l })),
      );
    }
    if (dto.experience?.length) {
      await trx('candidate_experience').insert(
        dto.experience.map((e) => ({
          candidate_id: candidateId,
          company_name: e.company_name || null,
          job_title:    e.job_title    || null,
          start_date:   e.start_date   || null,
          end_date:     e.end_date     || null,
          description:  e.description  || null,
          location:     e.location     || null,
        })),
      );
    }
    if (dto.education?.length) {
      await trx('candidate_education').insert(
        dto.education.map((e) => ({
          candidate_id: candidateId,
          institution:  e.institution  || null,
          degree:       e.degree       || null,
          field_of_study: e.field_of_study || null,
          start_year:   e.start_year   || null,
          end_year:     e.end_year     || null,
          location:     e.location     || null,
        })),
      );
    }
    if (dto.certificates?.length) {
      await trx('candidate_certificates').insert(
        dto.certificates.map((c) => ({ candidate_id: candidateId, ...c })),
      );
    }
  });

  // 4. Send credentials email (non-blocking)
  sendCandidateCredentials(
    dto.email,
    dto.password,
    `${dto.first_name} ${dto.last_name}`,
  ).catch((err) => console.error('[EMAIL] Failed to send credentials:', err));

  return getCandidateById(candidateId);
}

// ── Base query (shared by list + export) ──────────────────────────────────────

function buildBaseQuery() {
  return db('candidates as e')
    .join('users as u', 'u.id', 'e.user_id')
    .where('u.is_active', true);
}

// ── Filter helper (shared by list + export) ───────────────────────────────────

function applyFilters(query: any, filters: CandidateFilterDto): any {
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.where((b: any) =>
      b.whereILike('e.first_name', term)
       .orWhereILike('e.last_name', term)
       .orWhereILike('u.email', term)
       .orWhereILike('e.job_title', term)
       .orWhereILike('e.occupation', term),
    );
  }
  if (filters.occupation) query = query.whereILike('e.occupation', `%${filters.occupation}%`);
  if (filters.industry) {
    const list = filters.industry.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (list.length === 1) query = query.whereILike('e.industry', `%${list[0]}%`);
    else query = query.where((b: any) => { list.forEach((i: string) => b.orWhereILike('e.industry', `%${i}%`)); });
  }
  const minExp = filters.yearsExpMin ?? filters.yearsExperience;
  if (minExp != null) query = query.where('e.years_experience', '>=', minExp);
  if (filters.yearsExpMax != null) query = query.where('e.years_experience', '<=', filters.yearsExpMax);
  if (filters.currentCountry) {
    const list = filters.currentCountry.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (list.length === 1) query = query.whereILike('e.current_country', `%${list[0]}%`);
    else query = query.where((b: any) => { list.forEach((c: string) => b.orWhereILike('e.current_country', `%${c}%`)); });
  }
  if (filters.currentCity) query = query.whereILike('e.current_city', `%${filters.currentCity}%`);
  if (filters.nationality) {
    const list = filters.nationality.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (list.length === 1) query = query.whereILike('e.nationality', `%${list[0]}%`);
    else query = query.where((b: any) => { list.forEach((n: string) => b.orWhereILike('e.nationality', `%${n}%`)); });
  }
  if (filters.university) {
    query = query.whereIn('e.id', (sub: any) =>
      sub.select('candidate_id').from('candidate_education')
         .whereILike('institution', `%${filters.university}%`),
    );
  }
  if (filters.fieldOfStudy) {
    query = query.whereIn('e.id', (sub: any) =>
      sub.select('candidate_id').from('candidate_education')
         .whereILike('field_of_study', `%${filters.fieldOfStudy}%`),
    );
  }
  if (filters.educationLevel) {
    const levels = filters.educationLevel.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    if (levels.length) {
      query = query.whereIn('e.id', (sub: any) => {
        sub.select('candidate_id').from('candidate_education').where((b: any) => {
          levels.forEach((l: string) => b.orWhereILike('degree', `%${l}%`));
        });
      });
    }
  }
  if (filters.skills) {
    const skillList = filters.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (skillList.length) {
      query = query.whereIn('e.id', (sub: any) =>
        sub.select('candidate_id').from('candidate_skills').whereIn('skill_name', skillList),
      );
    }
  }
  if (filters.languages) {
    const langList = filters.languages.split(',').map((l: string) => l.trim()).filter(Boolean);
    if (langList.length) {
      query = query.whereIn('e.id', (sub: any) =>
        sub.select('candidate_id').from('candidate_languages').whereIn('language', langList),
      );
    }
  }
  if (filters.salaryMin) query = query.where('e.salary_min', '>=', filters.salaryMin);
  if (filters.salaryMax) query = query.where('e.salary_max', '<=', filters.salaryMax);
  if (filters.ageMin != null) {
    const maxDob = new Date();
    maxDob.setFullYear(maxDob.getFullYear() - filters.ageMin);
    query = query.where('e.date_of_birth', '<=', maxDob.toISOString().slice(0, 10));
  }
  if (filters.ageMax != null) {
    const minDob = new Date();
    minDob.setFullYear(minDob.getFullYear() - filters.ageMax - 1);
    query = query.where('e.date_of_birth', '>=', minDob.toISOString().slice(0, 10));
  }
  if (filters.gender)                query = query.where('e.gender', filters.gender);
  if (filters.profileStatus)         query = query.where('e.profile_status', filters.profileStatus);
  if (filters.registrationFeeStatus) query = query.where('e.registration_fee_status', filters.registrationFeeStatus);
  if (filters.cvFormat)              query = query.where('e.cv_format', filters.cvFormat);
  if (filters.hasVideo === 'true')   query = query.whereNotNull('e.intro_video_url');
  if (filters.hasVideo === 'false')  query = query.whereNull('e.intro_video_url');
  return query;
}

// ── Sort helper ───────────────────────────────────────────────────────────────

function applySortOrder(query: any, sortBy: string): any {
  switch (sortBy) {
    case 'oldest':
      return query.orderBy('e.created_at', 'asc');
    case 'completion':
      return query.orderByRaw(`
        (15
          + CASE WHEN e.profile_photo_url IS NOT NULL THEN 15 ELSE 0 END
          + CASE WHEN e.job_title IS NOT NULL AND e.job_title <> '' THEN 10 ELSE 0 END
          + CASE WHEN e.industry IS NOT NULL AND e.industry <> '' THEN 10 ELSE 0 END
          + CASE WHEN e.current_country IS NOT NULL AND e.current_country <> '' THEN 10 ELSE 0 END
          + CASE WHEN e.nationality IS NOT NULL AND e.nationality <> '' THEN 5 ELSE 0 END
          + CASE WHEN e.years_experience IS NOT NULL THEN 10 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM candidate_languages cl WHERE cl.candidate_id = e.id AND LOWER(cl.language) = 'english') THEN 10 ELSE 0 END
          + CASE WHEN e.intro_video_url IS NOT NULL THEN 10 ELSE 0 END
          + CASE WHEN e.target_locations IS NOT NULL AND array_length(e.target_locations, 1) > 0 THEN 5 ELSE 0 END
        ) DESC
      `);
    case 'updated':
      return query.orderBy('e.updated_at', 'desc');
    case 'alphabetical':
      return query.orderBy('e.first_name', 'asc').orderBy('e.last_name', 'asc');
    default: // 'newest'
      return query.orderBy('e.created_at', 'desc');
  }
}

// ── List / Filter ─────────────────────────────────────────────────────────────

export async function listCandidates(filters: CandidateFilterDto) {
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = buildBaseQuery().select(
      'e.id', 'e.candidate_number', 'e.first_name', 'e.last_name', 'e.job_title',
      'e.industry', 'e.occupation', 'e.current_country', 'e.current_city',
      'e.years_experience', 'e.salary_min', 'e.salary_max', 'e.salary_currency',
      'e.profile_photo_url', 'e.profile_status', 'e.intro_video_url', 'e.created_at',
      'e.nationality', 'e.target_locations', 'e.date_of_birth', 'e.gender',
      'e.plain_password', 'e.registration_fee_status', 'e.cv_format',
      'u.email', 'u.is_active',
      db.raw(`(SELECT cl.proficiency FROM candidate_languages cl WHERE cl.candidate_id = e.id AND LOWER(cl.language) = 'english' LIMIT 1) as english_level`),
    );

  query = applyFilters(query, filters);

  const countQuery = query.clone().clearSelect().count('e.id as total').first();
  const [rows, countRow] = await Promise.all([
    applySortOrder(query, filters.sortBy).limit(limit).offset(offset),
    countQuery,
  ]);

  const total = Number((countRow as any)?.total ?? 0);
  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Export / CSV ──────────────────────────────────────────────────────────────

export async function exportCandidates(filters: CandidateFilterDto) {
  let query = buildBaseQuery().select(
      'e.candidate_number', 'e.first_name', 'e.last_name',
      'u.email', 'e.phone',
      'e.current_country', 'e.target_locations',
      'e.profile_status', 'e.registration_fee_status', 'e.cv_format',
      'e.created_at',
    );

  query = applyFilters(query, filters);
  return query.orderBy('e.created_at', 'desc');
}

// ── Get by ID ─────────────────────────────────────────────────────────────────

export async function getCandidateById(id: string) {
  const candidate = await db('candidates as e')
    .join('users as u', 'u.id', 'e.user_id')
    .where('e.id', id)
    .select('e.*', 'u.email', 'u.is_active')
    .first();
  if (!candidate) throw new AppError(404, 'Candidate not found');

  const relations = await fetchRelations(id);

  return { ...candidate, ...relations };
}

// ── Get by user_id (for candidate self-view) ───────────────────────────────────

export async function getCandidateByUserId(userId: string) {
  const candidate = await db('candidates').where({ user_id: userId }).first();
  if (!candidate) throw new AppError(404, 'Candidate profile not found');
  return getCandidateById(candidate.id);
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateCandidate(id: string, dto: UpdateCandidateDto) {
  const candidate = await db('candidates').where({ id }).first();
  if (!candidate) throw new AppError(404, 'Candidate not found');

  await db.transaction(async (trx) => {
    // Update core fields
    const {
      skills, languages, experience, education, certificates, new_password, ...coreFields
    } = dto;

    // Handle password change
    if (new_password) {
      const hash = await bcrypt.hash(new_password, 12);
      await trx('users').where({ id: candidate.user_id }).update({ password_hash: hash });
      (coreFields as any).plain_password = new_password;
    }

    if (Object.keys(coreFields).length) {
      await trx('candidates')
        .where({ id })
        .update({ ...coreFields, updated_at: new Date() });
    }

    // Replace relations if provided
    if (skills !== undefined) {
      await trx('candidate_skills').where({ candidate_id: id }).delete();
      if (skills.length)
        await trx('candidate_skills').insert(skills.map((s) => ({ candidate_id: id, ...s })));
    }
    if (languages !== undefined) {
      await trx('candidate_languages').where({ candidate_id: id }).delete();
      if (languages.length)
        await trx('candidate_languages').insert(languages.map((l) => ({ candidate_id: id, ...l })));
    }
    if (experience !== undefined) {
      await trx('candidate_experience').where({ candidate_id: id }).delete();
      if (experience.length)
        await trx('candidate_experience').insert(
          experience.map((e) => ({
            candidate_id: id,
            company_name: e.company_name || null,
            job_title:    e.job_title    || null,
            start_date:   e.start_date   || null,
            end_date:     e.end_date     || null,
            description:  e.description  || null,
            location:     e.location     || null,
          })),
        );
    }
    if (education !== undefined) {
      await trx('candidate_education').where({ candidate_id: id }).delete();
      if (education.length)
        await trx('candidate_education').insert(
          education.map((e) => ({
            candidate_id:   id,
            institution:    e.institution    || null,
            degree:         e.degree         || null,
            field_of_study: e.field_of_study || null,
            start_year:     e.start_year     || null,
            end_year:       e.end_year       || null,
            location:       e.location       || null,
          })),
        );
    }
    if (certificates !== undefined) {
      await trx('candidate_certificates').where({ candidate_id: id }).delete();
      if (certificates.length)
        await trx('candidate_certificates').insert(certificates.map((c) => ({ candidate_id: id, ...c })));
    }
  });

  return getCandidateById(id);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteCandidate(id: string) {
  const candidate = await db('candidates').where({ id }).first();
  if (!candidate) throw new AppError(404, 'Candidate not found');

  // Cascade deletes user → candidate (FK ON DELETE CASCADE)
  await db('users').where({ id: candidate.user_id }).delete();
}

// ── Update file URL ───────────────────────────────────────────────────────────

export async function updateCandidateFile(
  candidateId: string,
  field: 'profile_photo_url' | 'resume_url' | 'intro_video_url',
  relativePath: string,
) {
  await db('candidates')
    .where({ id: candidateId })
    .update({ [field]: relativePath, updated_at: new Date() });
}

export async function addCertificateFile(
  candidateId: string,
  name: string,
  relativePath: string,
) {
  await db('candidate_certificates').insert({
    candidate_id: candidateId,
    name,
    file_url: relativePath,
  });
}

// ── Bulk actions ─────────────────────────────────────────────────────────────

export async function bulkAction(
  candidateIds: string[],
  action: 'mark_fee_paid' | 'change_status',
  payload?: { profile_status?: string },
): Promise<{ updated: number }> {
  if (!candidateIds.length) return { updated: 0 };

  switch (action) {
    case 'mark_fee_paid':
      await db('candidates')
        .whereIn('id', candidateIds)
        .update({ registration_fee_status: 'paid', updated_at: new Date() });
      return { updated: candidateIds.length };

    case 'change_status': {
      const status = payload?.profile_status;
      if (!status) throw new AppError(400, 'payload.profile_status is required for change_status');
      await db('candidates')
        .whereIn('id', candidateIds)
        .update({ profile_status: status, updated_at: new Date() });
      return { updated: candidateIds.length };
    }

    default:
      throw new AppError(400, `Unknown bulk action: ${action}`);
  }
}

// ── Resend credentials ─────────────────────────────────────────────────────────

export async function resendCredentials(candidateId: string): Promise<void> {
  const candidate = await db('candidates as e')
    .join('users as u', 'u.id', 'e.user_id')
    .where('e.id', candidateId)
    .select('u.email', 'e.first_name', 'e.last_name', 'e.plain_password')
    .first();

  if (!candidate) throw new AppError(404, 'Candidate not found');
  if (!candidate.plain_password) throw new AppError(400, 'No stored password for this candidate. Please set a new password via the edit form first.');

  await sendCandidateCredentials(
    candidate.email,
    candidate.plain_password,
    `${candidate.first_name} ${candidate.last_name}`,
  );
}
