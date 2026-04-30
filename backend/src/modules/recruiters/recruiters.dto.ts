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
  company_name:      z.string().max(200).optional().nullable(),
  new_password:      z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  access_expires_at: z.string().datetime().optional(),
  is_active:         z.boolean().optional(),
});

export const RecruiterFilterSchema = z.object({
  search:            z.string().optional(),
  company:           z.string().optional(),
  isActive:          z.enum(['true', 'false']).optional(), // legacy — prefer accountStatus
  // New filters
  companyCountry:    z.string().optional(),
  industry:          z.string().optional(),                // comma-sep multi
  hasSponsorLicence: z.enum(['yes', 'no', 'unknown']).optional(),
  sponsorCountry:    z.string().optional(),                // comma-sep multi
  accountStatus:     z.enum(['active', 'inactive', 'expired']).optional(),
  joinedFrom:        z.string().optional(),                // YYYY-MM-DD
  joinedTo:          z.string().optional(),                // YYYY-MM-DD
  lastActive:        z.enum(['7_days', '30_days', '90_days']).optional(),
  page:              z.coerce.number().int().positive().default(1),
  limit:             z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRecruiterDto  = z.infer<typeof CreateRecruiterSchema>;
export type UpdateRecruiterDto  = z.infer<typeof UpdateRecruiterSchema>;
export type RecruiterFilterDto  = z.infer<typeof RecruiterFilterSchema>;
