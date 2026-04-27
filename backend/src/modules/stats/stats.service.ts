// src/modules/stats/stats.service.ts
import { db } from '../../config/db';

const toCount = (row: any): number => Number(row?.count ?? 0);

export async function getAdminStats() {
  const [
    candidates, recruiters, pendingEdits, auditLogsToday,
    registrationsToday, profilesForwardedToday,
  ] = await Promise.all([
    db('candidates').count('id as count').first(),
    db('users').where({ role_id: db('roles').select('id').where({ name: 'recruiter' }) }).count('id as count').first(),
    db('profile_edit_requests').where({ status: 'pending' }).count('id as count').first(),
    db('audit_logs').whereRaw('DATE(created_at) = CURRENT_DATE').count('id as count').first(),
    db('candidates').whereRaw('DATE(created_at) = CURRENT_DATE').count('id as count').first(),
    db('contact_unlock_requests')
      .where({ status: 'approved' })
      .whereRaw('DATE(reviewed_at) = CURRENT_DATE')
      .count('id as count').first(),
  ]);

  return {
    candidates:             toCount(candidates),
    recruiters:             toCount(recruiters),
    pendingEdits:           toCount(pendingEdits),
    auditLogsToday:         toCount(auditLogsToday),
    registrationsToday:     toCount(registrationsToday),
    profilesForwardedToday: toCount(profilesForwardedToday),
  };
}

export async function getCandidateStats(userId: string) {
  const candidate = await db('candidates').where({ user_id: userId }).first();
  if (!candidate) return { profileCompleteness: 0, pendingRequest: false };

  // Fetch relation counts in parallel
  const [skillsRow, langsRow, expRow, eduRow] = await Promise.all([
    db('candidate_skills').where({ candidate_id: candidate.id }).count('id as count').first(),
    db('candidate_languages').where({ candidate_id: candidate.id }).count('id as count').first(),
    db('candidate_experience').where({ candidate_id: candidate.id }).count('id as count').first(),
    db('candidate_education').where({ candidate_id: candidate.id }).count('id as count').first(),
  ]);

  const hasSkills  = Number(skillsRow?.count  ?? 0) > 0;
  const hasLangs   = Number(langsRow?.count   ?? 0) > 0;
  const hasExp     = Number(expRow?.count     ?? 0) > 0;
  const hasEdu     = Number(eduRow?.count     ?? 0) > 0;

  // Each item is [isFilled, weight] — weights sum to 100
  const checks: [boolean, number][] = [
    // Core identity (always present after registration, but keep for completeness)
    [!!candidate.job_title,       10],
    [!!candidate.bio,             10],
    // Personal
    [!!candidate.phone,            5],
    [!!candidate.date_of_birth,    5],
    [!!candidate.nationality,      5],
    [!!candidate.current_country,  5],
    // Professional
    [!!candidate.industry,         5],
    [!!candidate.occupation,       5],
    [candidate.years_experience != null,  5],
    // Media / documents
    [!!candidate.profile_photo_url, 10],
    [!!candidate.resume_url,        10],
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
    .where({ candidate_id: candidate.id, status: 'pending' })
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
    db('candidates').count('id as count').first(),
  ]);

  return {
    shortlistCount:      toCount(shortlistCount),
    candidatesAvailable: toCount(candidatesAvailable),
  };
}

export async function getPublicStats() {
  const [candidatesRow, companiesRow, matchesRow] = await Promise.all([
    db('candidates').count('id as count').first(),
    db('recruiters').count('id as count').first(),
    db('shortlists').count('id as count').first(),
  ]);
  return {
    totalCandidates: toCount(candidatesRow),
    totalCompanies:  toCount(companiesRow),
    totalMatches:    toCount(matchesRow),
  };
}
