// src/modules/employees/employees.service.ts
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { sendEmployeeCredentials } from '../../services/email.service';
import { env } from '../../config/env';
import type { CreateEmployeeDto, UpdateEmployeeDto, EmployeeFilterDto } from './employees.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRoleId(roleName: string): Promise<number> {
  const role = await db('roles').where({ name: roleName }).first();
  if (!role) throw new AppError(500, `Role "${roleName}" not found. Run seeds first.`);
  return role.id;
}

async function fetchRelations(employeeId: string) {
  const [skills, languages, experience, education, certificates] = await Promise.all([
    db('employee_skills').where({ employee_id: employeeId }),
    db('employee_languages').where({ employee_id: employeeId }),
    db('employee_experience').where({ employee_id: employeeId }).orderBy('start_date', 'desc'),
    db('employee_education').where({ employee_id: employeeId }).orderBy('start_year', 'desc'),
    db('employee_certificates').where({ employee_id: employeeId }),
  ]);
  return { skills, languages, experience, education, certificates };
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createEmployee(dto: CreateEmployeeDto, createdByAdminId: string) {
  // Check email uniqueness
  const existing = await db('users').where({ email: dto.email.toLowerCase() }).first();
  if (existing) throw new AppError(409, 'Email is already registered');

  const employeeRoleId = await getRoleId('employee');
  const passwordHash   = await bcrypt.hash(dto.password, 12);
  const userId         = uuidv4();
  const employeeId     = uuidv4();

  await db.transaction(async (trx) => {
    // 1. Create user account
    await trx('users').insert({
      id:            userId,
      email:         dto.email.toLowerCase(),
      password_hash: passwordHash,
      role_id:       employeeRoleId,
      is_active:     true,
    });

    // 2. Create employee profile
    await trx('employees').insert({
      id:               employeeId,
      user_id:          userId,
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
      target_locations: dto.target_locations ?? null,
      salary_min:      dto.salary_min      ?? null,
      salary_max:      dto.salary_max      ?? null,
      salary_currency: dto.salary_currency ?? null,
      salary_type:     dto.salary_type     ?? null,
      profile_status:  'active',
    });

    // 3. Insert related arrays
    if (dto.skills?.length) {
      await trx('employee_skills').insert(
        dto.skills.map((s) => ({ employee_id: employeeId, ...s })),
      );
    }
    if (dto.languages?.length) {
      await trx('employee_languages').insert(
        dto.languages.map((l) => ({ employee_id: employeeId, ...l })),
      );
    }
    if (dto.experience?.length) {
      await trx('employee_experience').insert(
        dto.experience.map((e) => ({ employee_id: employeeId, ...e })),
      );
    }
    if (dto.education?.length) {
      await trx('employee_education').insert(
        dto.education.map((e) => ({ employee_id: employeeId, ...e })),
      );
    }
    if (dto.certificates?.length) {
      await trx('employee_certificates').insert(
        dto.certificates.map((c) => ({ employee_id: employeeId, ...c })),
      );
    }
  });

  // 4. Send credentials email (non-blocking)
  sendEmployeeCredentials(
    dto.email,
    dto.password,
    `${dto.first_name} ${dto.last_name}`,
  ).catch((err) => console.error('[EMAIL] Failed to send credentials:', err));

  return getEmployeeById(employeeId);
}

// ── List / Filter ─────────────────────────────────────────────────────────────

export async function listEmployees(filters: EmployeeFilterDto) {
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = db('employees as e')
    .join('users as u', 'u.id', 'e.user_id')
    .select(
      'e.id', 'e.first_name', 'e.last_name', 'e.job_title',
      'e.industry', 'e.occupation', 'e.current_country', 'e.current_city',
      'e.years_experience', 'e.salary_min', 'e.salary_max', 'e.salary_currency',
      'e.profile_photo_url', 'e.profile_status', 'e.created_at',
      'u.email', 'u.is_active',
    )
    .where('u.is_active', true);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.where((b) =>
      b.whereILike('e.first_name', term)
       .orWhereILike('e.last_name', term)
       .orWhereILike('u.email', term)
       .orWhereILike('e.job_title', term),
    );
  }
  if (filters.industry)       query = query.whereILike('e.industry', `%${filters.industry}%`);
  if (filters.occupation)     query = query.whereILike('e.occupation', `%${filters.occupation}%`);
  if (filters.currentCountry) query = query.where('e.current_country', filters.currentCountry);
  if (filters.salaryMin)      query = query.where('e.salary_min', '>=', filters.salaryMin);
  if (filters.salaryMax)      query = query.where('e.salary_max', '<=', filters.salaryMax);
  if (filters.yearsExperience)
    query = query.where('e.years_experience', '>=', filters.yearsExperience);

  // Skills filter via subquery
  if (filters.skills) {
    const skillList = filters.skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillList.length) {
      query = query.whereIn('e.id', (sub) => {
        sub.select('employee_id').from('employee_skills').whereIn('skill_name', skillList);
      });
    }
  }

  // Languages filter via subquery
  if (filters.languages) {
    const langList = filters.languages.split(',').map((l) => l.trim()).filter(Boolean);
    if (langList.length) {
      query = query.whereIn('e.id', (sub) => {
        sub.select('employee_id').from('employee_languages').whereIn('language', langList);
      });
    }
  }

  // Total count (same filters, no pagination)
  const countQuery = query.clone().clearSelect().count('e.id as total').first();
  const [rows, countRow] = await Promise.all([
    query.orderBy('e.created_at', 'desc').limit(limit).offset(offset),
    countQuery,
  ]);

  const total = Number((countRow as any)?.total ?? 0);
  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ── Get by ID ─────────────────────────────────────────────────────────────────

export async function getEmployeeById(id: string) {
  const employee = await db('employees as e')
    .join('users as u', 'u.id', 'e.user_id')
    .where('e.id', id)
    .select('e.*', 'u.email', 'u.is_active')
    .first();

  if (!employee) throw new AppError(404, 'Employee not found');

  const relations = await fetchRelations(id);

  // Build file URLs
  const base = env.APP_URL;
  if (employee.profile_photo_url) employee.profile_photo_url = `${base}${employee.profile_photo_url}`;
  if (employee.resume_url)        employee.resume_url        = `${base}${employee.resume_url}`;
  if (employee.intro_video_url)   employee.intro_video_url   = `${base}${employee.intro_video_url}`;

  relations.certificates = relations.certificates.map((c: any) => ({
    ...c,
    file_url: c.file_url ? `${base}${c.file_url}` : null,
  }));

  return { ...employee, ...relations };
}

// ── Get by user_id (for employee self-view) ───────────────────────────────────

export async function getEmployeeByUserId(userId: string) {
  const employee = await db('employees').where({ user_id: userId }).first();
  if (!employee) throw new AppError(404, 'Employee profile not found');
  return getEmployeeById(employee.id);
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateEmployee(id: string, dto: UpdateEmployeeDto) {
  const employee = await db('employees').where({ id }).first();
  if (!employee) throw new AppError(404, 'Employee not found');

  await db.transaction(async (trx) => {
    // Update core fields
    const {
      skills, languages, experience, education, certificates, ...coreFields
    } = dto;

    if (Object.keys(coreFields).length) {
      await trx('employees')
        .where({ id })
        .update({ ...coreFields, updated_at: new Date() });
    }

    // Replace relations if provided
    if (skills !== undefined) {
      await trx('employee_skills').where({ employee_id: id }).delete();
      if (skills.length)
        await trx('employee_skills').insert(skills.map((s) => ({ employee_id: id, ...s })));
    }
    if (languages !== undefined) {
      await trx('employee_languages').where({ employee_id: id }).delete();
      if (languages.length)
        await trx('employee_languages').insert(languages.map((l) => ({ employee_id: id, ...l })));
    }
    if (experience !== undefined) {
      await trx('employee_experience').where({ employee_id: id }).delete();
      if (experience.length)
        await trx('employee_experience').insert(experience.map((e) => ({ employee_id: id, ...e })));
    }
    if (education !== undefined) {
      await trx('employee_education').where({ employee_id: id }).delete();
      if (education.length)
        await trx('employee_education').insert(education.map((e) => ({ employee_id: id, ...e })));
    }
    if (certificates !== undefined) {
      await trx('employee_certificates').where({ employee_id: id }).delete();
      if (certificates.length)
        await trx('employee_certificates').insert(certificates.map((c) => ({ employee_id: id, ...c })));
    }
  });

  return getEmployeeById(id);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteEmployee(id: string) {
  const employee = await db('employees').where({ id }).first();
  if (!employee) throw new AppError(404, 'Employee not found');

  // Cascade deletes user → employee (FK ON DELETE CASCADE)
  await db('users').where({ id: employee.user_id }).delete();
}

// ── Update file URL ───────────────────────────────────────────────────────────

export async function updateEmployeeFile(
  employeeId: string,
  field: 'profile_photo_url' | 'resume_url' | 'intro_video_url',
  relativePath: string,
) {
  await db('employees')
    .where({ id: employeeId })
    .update({ [field]: relativePath, updated_at: new Date() });
}

export async function addCertificateFile(
  employeeId: string,
  name: string,
  relativePath: string,
) {
  await db('employee_certificates').insert({
    employee_id: employeeId,
    name,
    file_url: relativePath,
  });
}

// ── Resend credentials ─────────────────────────────────────────────────────────

export async function resendCredentials(employeeId: string) {
  const employee = await db('employees as e')
    .join('users as u', 'u.id', 'e.user_id')
    .where('e.id', employeeId)
    .select('u.id as user_id', 'u.email', 'e.first_name', 'e.last_name')
    .first();

  if (!employee) throw new AppError(404, 'Employee not found');

  // Generate a new temp password
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
  const hash = await bcrypt.hash(tempPassword, 12);
  await db('users')
    .where({ id: employee.user_id })
    .update({ password_hash: hash });

  await sendEmployeeCredentials(
    employee.email,
    tempPassword,
    `${employee.first_name} ${employee.last_name}`,
  );
}
