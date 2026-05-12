// src/modules/agency-interest-requests/agency-interest-requests.dto.ts
import { z } from 'zod';

export const CreateInterestRequestSchema = z.object({
  candidate_id: z.string().uuid(),
  sector:       z.string().min(1).max(150),
  country:      z.string().min(1).max(100),
  message:      z.string().min(10).max(2000),
});

export const ReviewInterestRequestSchema = z.object({
  status:     z.enum(['approved', 'rejected']),
  admin_note: z.string().max(500).optional(),
});

export const RevokeInterestRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const InterestRequestFilterSchema = z.object({
  status:    z.enum(['pending', 'approved', 'rejected', 'revoked']).optional(),
  search:    z.string().trim().optional(),
  date_from: z.string().optional(),
  date_to:   z.string().optional(),
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().positive().max(100).default(20),
});

export type CreateInterestRequestDto  = z.infer<typeof CreateInterestRequestSchema>;
export type ReviewInterestRequestDto  = z.infer<typeof ReviewInterestRequestSchema>;
export type RevokeInterestRequestDto  = z.infer<typeof RevokeInterestRequestSchema>;
export type InterestRequestFilterDto  = z.infer<typeof InterestRequestFilterSchema>;
