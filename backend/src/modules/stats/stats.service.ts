// src/modules/stats/stats.service.ts
import { db } from '../../config/db';

const toCount = (row: any): number => Number(row?.count ?? 0);

export async function getAdminStats() {
  const [employees, recruiters, pendingEdits, auditLogsToday] = await Promise.all([
    db('employees').count('id as count').first(),
    db('users').where({ role_id: db('roles').select('id').where({ name: 'recruiter' }) }).count('id as count').first(),
    db('profile_edit_requests').where({ status: 'pending' }).count('id as count').first(),
    db('audit_logs').whereRaw('DATE(created_at) = CURRENT_DATE').count('id as count').first(),
  ]);

  return {
    employees:      toCount(employees),
    recruiters:     toCount(recruiters),
    pendingEdits:   toCount(pendingEdits),
    auditLogsToday: toCount(auditLogsToday),
  };
}

export async function getEmployeeStats(userId: string) {
  const employee = await db('employees').where({ user_id: userId }).first();
  if (!employee) return { profileCompleteness: 0, pendingRequest: false };

  // Fetch relation counts in parallel
  const [skillsRow, langsRow, expRow, eduRow] = await Promise.all([
    db('employee_skills').where({ employee_id: employee.id }).count('id as count').first(),
    db('employee_languages').where({ employee_id: employee.id }).count('id as count').first(),
    db('employee_experience').where({ employee_id: employee.id }).count('id as count').first(),
    db('employee_education').where({ employee_id: employee.id }).count('id as count').first(),
  ]);

  const hasSkills  = Number(skillsRow?.count  ?? 0) > 0;
  const hasLangs   = Number(langsRow?.count   ?? 0) > 0;
  const hasExp     = Number(expRow?.count     ?? 0) > 0;
  const hasEdu     = Number(eduRow?.count     ?? 0) > 0;

  // Each item is [isFilled, weight] — weights sum to 100
  const checks: [boolean, number][] = [
    // Core identity (always present after registration, but keep for completeness)
    [!!employee.job_title,       10],
    [!!employee.bio,             10],
    // Personal
    [!!employee.phone,            5],
    [!!employee.date_of_birth,    5],
    [!!employee.nationality,      5],
    [!!employee.current_country,  5],
    // Professional
    [!!employee.industry,         5],
    [!!employee.occupation,       5],
    [employee.years_experience != null,  5],
    // Media / documents
    [!!employee.profile_photo_url, 10],
    [!!employee.resume_url,        10],
    // Relations
    [hasSkills, 10],
    [hasExp,     8],
    [hasEdu,     5],
    [hasLangs,   2],
  ];

  const totalWeight  = checks.reduce((s, [, w]) => s + w, 0);
  const filledWeight = checks.reduce((s, [v, w]) => s + (v ? w : 0), 0);
  const profileCompleteness = Math.round((filledWeight / totalWeight) * 100);

  const pendingRequest = !!(await db('profile_edit_requests')
    .where({ employee_id: employee.id, status: 'pending' })
    .first());

  return { profileCompleteness, pendingRequest };
}

export async function getRecruiterStats(userId: string) {
  const recruiter = await db('recruiters').where({ user_id: userId }).first();
  const recruiterId = recruiter?.id ?? null;

  const [shortlistCount, candidatesAvailable] = await Promise.all([
    recruiterId
      ? db('shortlists').where({ recruiter_id: recruiterId }).count('id as count').first()
      : Promise.resolve({ count: 0 }),
    db('employees').count('id as count').first(),
  ]);

  return {
    shortlistCount:      toCount(shortlistCount),
    candidatesAvailable: toCount(candidatesAvailable),
  };
}
