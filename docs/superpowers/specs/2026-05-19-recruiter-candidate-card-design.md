# Recruiter Candidate Card Redesign

**Date:** 2026-05-19
**Status:** Approved

---

## Problem

The recruiter Search Talent page uses an inline custom card layout (`candidate-card` CSS class) that is visually inconsistent with the admin candidate card design (`cl-card__*` system). It also has no awareness of interest request status, shows no contact details for approved requests, and mixes admin-irrelevant fields.

---

## Goal

Replace the recruiter candidate list card with a new dedicated component that:
- Matches the admin `cl-card__*` visual design system
- Hides all admin-only fields
- Shows candidate contact details only when the recruiter has an approved interest request
- Displays interest request status on each card

---

## Approach

**New shared component:** `RecruiterCandidateCardComponent`
(`frontend/src/app/shared/components/recruiter-candidate-card/recruiter-candidate-card.component.ts`)

Reuses the global `cl-card__*` CSS classes from `styles.scss` — no new CSS namespace needed. The recruiter candidates list page (`candidates.component.ts`) switches from its inline card to `<app-recruiter-candidate-card>`.

---

## Card Sections

### Hero
- Avatar: `profile_photo_url` image, or initials fallback (`first_name[0] + last_name[0]`) with gradient background
- Full name: `first_name last_name`
- Job title: `job_title` or `occupation`

### Location Chips
- Nationality + flag emoji (`cl-card__loc-chip`)
- Current city + country + flag emoji (`cl-card__loc-chip`)
- First target location + flag emoji (`cl-card__loc-chip--target`)

### Stats Row
- Industry (`cl-card__stat`, building icon)
- Years of experience (`cl-card__stat`, clock icon)
- English level mapped to CEFR label (`cl-card__stat`, translate icon)

### Flags Row
- Intro video: `has-video` (camera icon, green) or `no-video` (muted)
- CV format badge: `cv_format` label (UK / EU / CA / AU / Gulf / Asia)

### Skills
- First 4 skills from `skills[]` array as chips
- `+N more` chip if more than 4

### Contact Details *(conditional — approved requests only)*
Shown between Flags and Skills when `candidate.phone || candidate.whatsapp || candidate.email` is non-null (populated by backend only for approved candidates):
- Phone: `candidate.phone`
- WhatsApp: `candidate.whatsapp`
- Email: `candidate.email`

Hidden entirely (no placeholder) for candidates without an approved request.

### Footer Actions
| Button | Condition | Behaviour |
|---|---|---|
| View Profile | Always | Navigate to `/recruiter/candidates/:id` |
| Shortlist | Always | Toggle; filled bookmark icon if `shortlistedIds.has(id)` |
| Request Interest | No active request | Opens interest request modal/form |
| `⏳ Pending` badge | `pending` request exists | Non-clickable status badge (amber) |
| `✓ Approved` badge | `approved` request exists | Non-clickable status badge (green) |

`rejected` and `revoked` requests are treated the same as no request — "Request Interest" button is shown again.

---

## Component Inputs / Outputs

```typescript
@Input({ required: true }) candidate: Candidate;
@Input() interestRequest: InterestRequest | null = null;  // null = no request
@Input() isShortlisted: boolean = false;
@Output() shortlist     = new EventEmitter<void>();
@Output() requestInterest = new EventEmitter<void>();
```

---

## Data Loading in `candidates.component.ts`

On page initialise, fire two parallel HTTP calls:
```typescript
forkJoin({
  candidates: this.candidateService.list(params),
  requests:   this.interestRequestService.getMyRequests(),
})
```

Build a `Map<string, InterestRequest>` keyed by `candidate_id` from the requests response. Pass the matching entry (or `null`) as `[interestRequest]` input to each card.

---

## Backend Change — Contact Fields in Candidate List Response

**File:** `backend/src/modules/candidates/candidates.service.ts` — `listCandidates()` function (or the query it calls).

**Change:** When the caller is a recruiter (identified via `req.user.role === 'recruiter'` and `req.user.recruiterId`), the query performs a `LEFT JOIN` on `agency_interest_requests` for the current `recruiter_id` with `status = 'approved'`. For rows where a matching approved request exists, `phone`, `whatsapp`, and `email` are included in the response. For all other rows these fields are omitted (`null`).

**Candidate model update:** Add optional contact fields to the `Candidate` interface:
```typescript
phone?:     string | null;
whatsapp?:  string | null;
email?:     string | null;
```

These are always `null` in the admin list (admin uses a separate detail view for contacts) and conditionally populated in the recruiter list.

---

## Fields Explicitly Hidden from Recruiter Card

- Login ID (`autocode-badge--login-id`)
- Profile status badge (active / pending / inactive)
- Registration fee flag (paid / pending / waived)
- Profile completion bar
- Updated date
- Edit, Forward, Mail, Delete admin action buttons

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/shared/components/recruiter-candidate-card/recruiter-candidate-card.component.ts` | **Create** — new component |
| `frontend/src/app/shared/components/index.ts` (or module) | Export new component |
| `frontend/src/app/features/recruiter/candidates/candidates.component.ts` | Load interest requests in `forkJoin`; build status map; replace inline card with `<app-recruiter-candidate-card>` |
| `frontend/src/app/core/models/candidate.model.ts` | Add optional `phone`, `whatsapp`, `email` fields |
| `backend/src/modules/candidates/candidates.service.ts` | Conditionally join + return contact fields for approved recruiter candidates |
| `backend/src/modules/candidates/candidates.controller.ts` | Pass `recruiterId` context into list service call |

---

## Out of Scope

- Admin candidate card — no changes
- Interest request modal/form — already exists; this design only triggers `requestInterest.emit()` to open it
- Recruiter candidate profile page — no changes
