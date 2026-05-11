// src/modules/stats/stats.service.ts
import { db } from '../../config/db';

const toCount = (row: any): number => Number(row?.count ?? 0);

export async function getAdminStats() {
  const [
    candidates, recruiters, pendingEdits, auditLogsToday,
    registrationsToday, profilesForwardedToday,
    totalVolunteers, activeVolunteers, candidatesHelpedThisMonth,
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
    // Volunteer stats
    db('volunteers').count('id as count').first(),
    db('volunteers').where({ availability: 'Active' }).count('id as count').first(),
    db('volunteer_support_requests')
      .where({ status: 'connected' })
      .whereRaw("date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE)")
      .count('id as count').first(),
  ]);

  return {
    candidates:                 toCount(candidates),
    recruiters:                 toCount(recruiters),
    pendingEdits:               toCount(pendingEdits),
    auditLogsToday:             toCount(auditLogsToday),
    registrationsToday:         toCount(registrationsToday),
    profilesForwardedToday:     toCount(profilesForwardedToday),
    totalVolunteers:            toCount(totalVolunteers),
    activeVolunteers:           toCount(activeVolunteers),
    candidatesHelpedThisMonth:  toCount(candidatesHelpedThisMonth),
  };
}

export async function getCandidateStats(userId: string) {
  const candidate = await db('candidates').where({ user_id: userId }).first();
  if (!candidate) return { profileCompleteness: 0, pendingRequest: false };

  // Mirrors the frontend candidate-card completionPercent formula exactly
  // so the dashboard percentage always matches the admin candidate list.
  // Base 15 (name always present after registration) + optional fields up to 100.
  let score = 15;
  if (candidate.profile_photo_url)                            score += 15;
  if (candidate.job_title)                                    score += 10;
  if (candidate.industry)                                     score += 10;
  if (candidate.current_country)                              score += 10;
  if (candidate.years_experience != null)                     score += 10;
  if (candidate.english_level)                                score += 10;
  if (candidate.intro_video_url)                              score += 10;
  if (candidate.nationality)                                  score +=  5;
  if (candidate.target_locations && candidate.target_locations.length > 0) score += 5;

  const profileCompleteness = Math.min(score, 100);

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

export async function getNotificationCounts() {
  const [pendingEditsRow, pendingContactRequestsRow, pendingVolunteerSupportRow, pendingInterestRequestsRow] = await Promise.all([
    db('profile_edit_requests').where({ status: 'pending' }).count('id as count').first(),
    db('contact_submissions').where({ is_read: false }).count('id as count').first(),
    db('volunteer_support_requests').where({ status: 'pending' }).count('id as count').first(),
    db('agency_interest_requests').where({ status: 'pending' }).count('id as count').first(),
  ]);

  return {
    pendingEdits:            toCount(pendingEditsRow),
    pendingContactRequests:  toCount(pendingContactRequestsRow),
    pendingVolunteerSupport: toCount(pendingVolunteerSupportRow),
    pendingInterestRequests: toCount(pendingInterestRequestsRow),
  };
}
