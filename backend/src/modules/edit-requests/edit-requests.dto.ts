// src/modules/edit-requests/edit-requests.dto.ts
import { z } from 'zod';
import { UpdateCandidateSchema } from '../candidates/candidates.dto';

// Candidate submits this — same shape as UpdateCandidate (all optional fields) + reason
export const SubmitEditRequestSchema = UpdateCandidateSchema.extend({
  reason: z.string().max(1000).optional().nullable(),
});

export const ReviewEditRequestSchema = z.object({
  status:     z.enum(['approved', 'rejected']),
  admin_note: z.string().max(1000).optional(),
});

export const REQUEST_TYPE_GROUPS: Record<string, string[]> = {
  personal:     ['first_name', 'last_name', 'date_of_birth', 'gender', 'marital_status', 'bio', 'phone', 'whatsapp_number', 'linkedin_url'],
  professional: ['job_title', 'occupation', 'industry', 'years_experience', 'employment_status', 'visa_status', 'notice_period_id'],
  location:     ['current_country', 'current_city', 'nationality', 'postal_code', 'has_passport', 'target_locations'],
  skills:       ['skills'],
  languages:    ['languages'],
  experience:   ['experience'],
  education:    ['education'],
  hobbies:      ['hobbies'],
  media:        ['profile_photo_url', 'resume_url', 'intro_video_url'],
};

export const EditRequestFilterSchema = z.object({
  status:       z.enum(['pending', 'approved', 'rejected']).optional(),
  search:       z.string().trim().optional(),
  date_from:    z.string().optional(),
  date_to:      z.string().optional(),
  request_type: z.enum(['personal', 'professional', 'location', 'skills', 'languages', 'experience', 'education', 'hobbies', 'media']).optional(),
  sort:         z.enum(['newest', 'oldest']).optional(),
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().positive().max(100).default(20),
});

export const BulkReviewEditRequestSchema = z.object({
  ids:        z.array(z.string().uuid()).min(1, 'At least one ID is required'),
  status:     z.enum(['approved', 'rejected']),
  admin_note: z.string().max(1000).optional(),
});

export type SubmitEditRequestDto      = z.infer<typeof SubmitEditRequestSchema>;
export type ReviewEditRequestDto      = z.infer<typeof ReviewEditRequestSchema>;
export type BulkReviewEditRequestDto  = z.infer<typeof BulkReviewEditRequestSchema>;
export type EditRequestFilterDto      = z.infer<typeof EditRequestFilterSchema>;
