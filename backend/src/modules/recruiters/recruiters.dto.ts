// src/modules/recruiters/recruiters.dto.ts
import { z } from 'zod';

export const CreateRecruiterSchema = z.object({
  email:             z.string().email(),
  contact_name:      z.string().min(1).max(200),
  company_name:      z.string().max(200).optional(),
  password:          z.string().min(8, 'Password must be at least 8 characters').max(100),
  access_expires_at: z.string().datetime({ message: 'access_expires_at must be a valid ISO datetime' }),
});

export const UpdateRecruiterSchema = z.object({
  contact_name:      z.string().min(1).max(200).optional(),
  company_name:      z.string().max(200).optional(),
  new_password:      z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  access_expires_at: z.string().datetime().optional(),
});

export const RecruiterFilterSchema = z.object({
  search:    z.string().optional(),
  company:   z.string().optional(),
  isActive:  z.enum(['true', 'false']).optional(),
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRecruiterDto  = z.infer<typeof CreateRecruiterSchema>;
export type UpdateRecruiterDto  = z.infer<typeof UpdateRecruiterSchema>;
export type RecruiterFilterDto  = z.infer<typeof RecruiterFilterSchema>;
