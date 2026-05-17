// src/modules/stats/stats.service.ts
import { db } from '../../config/db';

const toCount = (row: any): number => Number(row?.count ?? 0);

export async function getAdminStats() {
  const [
    candidates, activeCandidates, recruiters, pendingEdits, auditLogsToday,
    registrationsToday, profilesForwardedToday, interviewsArrangedToday,
    totalVolunteers, activeVolunteers, candidatesHelpedThisMonth,
    placementsMade, countriesActiveRow,
  ] = await Promise.all([
    // Total candidates
    db('candidates').count('id as count').first(),
    // Active candidates — profile_status column (not 'status')
    db('candidates').where({ profile_status: 'active' }).count('id as count').first(),
    // Recruiters — direct table count (simpler and correct)
    db('recruiters').count('id as count').first(),
    db('profile_edit_requests').where({ status: 'pending' }).count('id as count').first(),
    db('audit_logs').whereRaw("created_at >= date_trunc('day', now()) AND created_at < date_trunc('day', now()) + interval '1 day'").count('id as count').first(),
    db('candidates').whereRaw("created_at >= date_trunc('day', now()) AND created_at < date_trunc('day', now()) + interval '1 day'").count('id as count').first(),
    // Profiles forwarded = contact unlock requests approved today
    db('contact_unlock_requests')
      .where({ status: 'approved' })
      .whereRaw("reviewed_at >= date_trunc('day', now()) AND reviewed_at < date_trunc('day', now()) + interval '1 day'")
      .count('id as count').first(),
    // Interviews Arranged — dedicated feature not yet implemented; returns 0 until built
    Promise.resolve({ count: 0 }),
    // Volunteer stats
    db('volunteers').count('id as count').first(),
    db('volunteers').where({ availability: 'Active' }).count('id as count').first(),
    db('volunteer_support_requests')
      .where({ status: 'connected' })
      .whereRaw("date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE)")
      .count('id as count').first(),
    // Placements = candidates whose profile has been marked as 'placed' by admin
    db('candidates').where({ profile_status: 'placed' }).count('id as count').first(),
    // Countries active = distinct non-null current_country values
    db('candidates')
      .countDistinct('current_country as count')
      .whereNotNull('current_country')
      .first(),
  ]);

  return {
    candidates:                 toCount(candidates),
    activeCandidates:           toCount(activeCandidates),
    recruiters:                 toCount(recruiters),
    pendingEdits:               toCount(pendingEdits),
    auditLogsToday:             toCount(auditLogsToday),
    registrationsToday:         toCount(registrationsToday),
    profilesForwardedToday:     toCount(profilesForwardedToday),
    interviewsArrangedToday:    toCount(interviewsArrangedToday),
    totalVolunteers:            toCount(totalVolunteers),
    activeVolunteers:           toCount(activeVolunteers),
    candidatesHelpedThisMonth:  toCount(candidatesHelpedThisMonth),
    placementsMade:             toCount(placementsMade),
    countriesActive:            toCount(countriesActiveRow),
  };
}

export async function getCandidateStats(userId: string) {
  const candidate = await db('candidates').where({ user_id: userId }).first();
  if (!candidate) return { profileCompleteness: 0, pendingRequest: false };

  // english_level is not a column on candidates — derive it from candidate_languages
  const hasEnglish = !!(await db('candidate_languages')
    .where({ candidate_id: candidate.id })
    .whereRaw("LOWER(language) = 'english'")
    .first());

  // Mirrors the frontend candidate-card completionPercent formula exactly
  // so the dashboard percentage always matches the admin candidate list.
  // Base 15 (name always present after registration) + optional fields up to 100.
  let score = 15;
  if (candidate.profile_photo_url)                            score += 15;
  if (candidate.job_title)                                    score += 10;
  if (candidate.industry)                                     score += 10;
  if (candidate.current_country)                              score += 10;
  if (candidate.years_experience != null)                     score += 10;
  if (hasEnglish)                                             score += 10;
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
  const [
    pendingEditsRow,
    pendingContactRequestsRow,
    pendingVolunteerSupportRow,
    pendingInterestRequestsRow,
    pendingContactUnlockRequestsRow,
    pendingRecruiterAccessRequestsRow,
  ] = await Promise.all([
    db('profile_edit_requests').where({ status: 'pending' }).count('id as count').first(),
    db('contact_submissions').where({ is_read: false }).count('id as count').first(),      // Contact Req... sidebar
    db('volunteer_support_requests').where({ status: 'pending' }).count('id as count').first(),
    db('agency_interest_requests').where({ status: 'pending' }).count('id as count').first(), // Interest Requ... sidebar
    db('contact_unlock_requests').where({ status: 'pending' }).count('id as count').first(),  // Edit Requests tab 2
    db('recruiter_access_requests').where({ status: 'pending' }).count('id as count').first(), // Edit Requests tab 4
  ]);

  return {
    pendingEdits:                   toCount(pendingEditsRow),
    pendingContactRequests:         toCount(pendingContactRequestsRow),
    pendingVolunteerSupport:        toCount(pendingVolunteerSupportRow),
    pendingInterestRequests:        toCount(pendingInterestRequestsRow),
    pendingContactUnlockRequests:   toCount(pendingContactUnlockRequestsRow),
    pendingRecruiterAccessRequests: toCount(pendingRecruiterAccessRequestsRow),
  };
}
