// src/modules/recruiter-access-requests/recruiter-access-requests.dto.ts
import { z } from 'zod';

export const SubmitRecruiterAccessRequestSchema = z.object({
  email: z.string().email(),
  message: z.string().max(1000).optional().nullable(),
});
export type SubmitRecruiterAccessRequestDto = z.infer<typeof SubmitRecruiterAccessRequestSchema>;

export const ReviewRecruiterAccessRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  new_expires_at: z.string().datetime({ offset: true }).optional().nullable(),
  admin_note: z.string().max(500).optional().nullable(),
});
export type ReviewRecruiterAccessRequestDto = z.infer<typeof ReviewRecruiterAccessRequestSchema>;

export const ListRecruiterAccessRequestsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListRecruiterAccessRequestsDto = z.infer<typeof ListRecruiterAccessRequestsSchema>;
