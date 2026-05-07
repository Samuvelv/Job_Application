// src/modules/volunteer-support-requests/volunteer-support-requests.dto.ts
import { z } from 'zod';

export const CreateSupportRequestSchema = z.object({
  message: z.string().trim().max(500).optional(),
});

export const ReviewSupportRequestSchema = z.object({
  status:     z.enum(['connected', 'closed']),
  admin_note: z.string().trim().max(500).optional(),
});

export const SupportRequestFilterSchema = z.object({
  status: z.enum(['pending', 'connected', 'closed']).optional(),
  search: z.string().trim().optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

export type CreateSupportRequestDto   = z.infer<typeof CreateSupportRequestSchema>;
export type ReviewSupportRequestDto   = z.infer<typeof ReviewSupportRequestSchema>;
export type SupportRequestFilterDto   = z.infer<typeof SupportRequestFilterSchema>;
