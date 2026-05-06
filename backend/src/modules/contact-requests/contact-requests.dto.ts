// src/modules/contact-requests/contact-requests.dto.ts
import { z } from 'zod';

export const ReviewContactRequestSchema = z.object({
  status:     z.enum(['approved', 'rejected']),
  admin_note: z.string().max(500).optional(),
});

export const ContactRequestFilterSchema = z.object({
  status:    z.enum(['pending', 'approved', 'rejected']).optional(),
  search:    z.string().trim().optional(),
  date_from: z.string().optional(),
  date_to:   z.string().optional(),
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().positive().max(100).default(20),
});

export type ReviewContactRequestDto  = z.infer<typeof ReviewContactRequestSchema>;
export type ContactRequestFilterDto  = z.infer<typeof ContactRequestFilterSchema>;
