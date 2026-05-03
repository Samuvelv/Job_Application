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

export const EditRequestFilterSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

export type SubmitEditRequestDto  = z.infer<typeof SubmitEditRequestSchema>;
export type ReviewEditRequestDto  = z.infer<typeof ReviewEditRequestSchema>;
export type EditRequestFilterDto  = z.infer<typeof EditRequestFilterSchema>;
