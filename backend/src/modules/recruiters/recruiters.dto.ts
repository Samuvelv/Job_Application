// src/modules/recruiters/recruiters.dto.ts
import { z } from 'zod';

export const CreateRecruiterSchema = z.object({
  email:        z.string().email(),
  contact_name: z.string().min(1).max(200),
  company_name: z.string().max(200).optional(),
  /** How many seconds the portal access lasts (default 7 days) */
  access_duration_seconds: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  /** If true the recruiter link email is sent immediately */
  send_email: z.boolean().default(true),
});

export const GenerateTokenSchema = z.object({
  access_duration_seconds: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  send_email: z.boolean().default(true),
});

export const RecruiterFilterSchema = z.object({
  search: z.string().optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRecruiterDto  = z.infer<typeof CreateRecruiterSchema>;
export type GenerateTokenDto    = z.infer<typeof GenerateTokenSchema>;
export type RecruiterFilterDto  = z.infer<typeof RecruiterFilterSchema>;
