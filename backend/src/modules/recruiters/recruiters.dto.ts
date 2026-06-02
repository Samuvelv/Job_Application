// src/modules/recruiters/recruiters.dto.ts
import { z } from 'zod';

export const RecruiterTypeEnum = z.enum(['direct_employer', 'recruitment_agency']);
export type RecruiterType = z.infer<typeof RecruiterTypeEnum>;

export const CreateRecruiterSchema = z.object({
  email:                     z.string().email(),
  contact_name:              z.string().min(1).max(200),
  type:                      RecruiterTypeEnum.default('direct_employer'),
  contact_job_title:         z.string().max(150).optional(),
  phone:                     z.string().max(50).optional(),
  whatsapp_number:           z.string().max(30).optional(),
  company_name:              z.string().max(200).optional(),
  company_website:           z.string().max(300).optional(),
  company_country:           z.string().max(100).optional(),
  company_city:              z.string().max(100).optional(),
  industry:                  z.string().max(150).optional(),
  company_size:              z.string().max(20).optional(),
  has_sponsor_licence:       z.enum(['yes', 'no', 'applied', 'unknown']).optional(),
  sponsor_licence_number:    z.string().max(100).optional(),
  sponsor_licence_countries: z.array(z.string()).optional(),
  licence_rating:            z.string().max(20).optional(),
  licence_verified:          z.boolean().optional(),
  target_nationalities:      z.array(z.string()).optional(),
  countries_place_in:        z.array(z.string()).optional(),
  sectors_recruit_for:       z.array(z.string()).optional(),
  hires_per_year:            z.string().max(50).optional(),
  job_types:                 z.array(z.string()).optional(),
  password:                  z.string().min(8, 'Password must be at least 8 characters').max(100),
  account_status:            z.enum(['active', 'pending', 'suspended']).optional(),
  is_active:                 z.boolean().optional(),
  access_start_date:         z.string().optional(),
  access_expires_at:         z.string().datetime({ message: 'access_expires_at must be a valid ISO datetime' }),
  free_account:              z.boolean().optional(),
  admin_notes:               z.string().optional(),
  enable_translation:        z.boolean().optional(),
});

export const UpdateRecruiterSchema = z.object({
  email:                     z.string().email().optional(),
  contact_name:              z.string().min(1).max(200).optional(),
  type:                      RecruiterTypeEnum.optional(),
  contact_job_title:         z.string().max(150).optional().nullable(),
  phone:                     z.string().max(50).optional().nullable(),
  whatsapp_number:           z.string().max(30).optional().nullable(),
  company_name:              z.string().max(200).optional().nullable(),
  company_website:           z.string().max(300).optional().nullable(),
  company_country:           z.string().max(100).optional().nullable(),
  company_city:              z.string().max(100).optional().nullable(),
  industry:                  z.string().max(150).optional().nullable(),
  company_size:              z.string().max(20).optional().nullable(),
  has_sponsor_licence:       z.enum(['yes', 'no', 'applied', 'unknown']).optional().nullable(),
  sponsor_licence_number:    z.string().max(100).optional().nullable(),
  sponsor_licence_countries: z.array(z.string()).optional().nullable(),
  licence_rating:            z.string().max(20).optional().nullable(),
  licence_verified:          z.boolean().optional(),
  target_nationalities:      z.array(z.string()).optional().nullable(),
  countries_place_in:        z.array(z.string()).optional().nullable(),
  sectors_recruit_for:       z.array(z.string()).optional().nullable(),
  hires_per_year:            z.string().max(50).optional().nullable(),
  job_types:                 z.array(z.string()).optional().nullable(),
  account_status:            z.enum(['active', 'pending', 'suspended']).optional(),
  is_active:                 z.boolean().optional(),
  access_start_date:         z.string().optional().nullable(),
  access_expires_at:         z.string().datetime().optional(),
  free_account:              z.boolean().optional(),
  admin_notes:               z.string().optional().nullable(),
  new_password:              z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  enable_translation:        z.boolean().optional(),
});

export const RecruiterFilterSchema = z.object({
  search:            z.string().optional(),
  company:           z.string().optional(),
  isActive:          z.enum(['true', 'false']).optional(), // legacy — prefer accountStatus
  companyCountry:    z.string().optional(),
  industry:          z.string().optional(),                // comma-sep multi
  hasSponsorLicence: z.enum(['yes', 'no', 'applied', 'unknown']).optional(),
  sponsorCountry:    z.string().optional(),                // comma-sep multi
  accountStatus:     z.enum(['active', 'pending', 'suspended', 'inactive', 'expired']).optional(),
  joinedFrom:        z.string().optional(),                // YYYY-MM-DD
  joinedTo:          z.string().optional(),                // YYYY-MM-DD
  lastActive:        z.enum(['7_days', '30_days', '90_days']).optional(),
  sortBy:            z.enum(['newest', 'oldest', 'most_active', 'alphabetical', 'last_active']).default('newest'),
  page:              z.coerce.number().int().positive().default(1),
  limit:             z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRecruiterDto  = z.infer<typeof CreateRecruiterSchema>;
export type UpdateRecruiterDto  = z.infer<typeof UpdateRecruiterSchema>;
export type RecruiterFilterDto  = z.infer<typeof RecruiterFilterSchema>;
