// src/modules/contact-requests/contact-requests.dto.ts
import { z } from 'zod';

export const ReviewContactRequestSchema = z.object({
  status:     z.enum(['approved', 'rejected']),
  admin_note: z.string().max(500).optional(),
});

export type ReviewContactRequestDto = z.infer<typeof ReviewContactRequestSchema>;
