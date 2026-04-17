// src/modules/employees/employees.dto.ts
import { z } from 'zod';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

export const SkillSchema = z.object({
  skill_name:  z.string().min(1, 'Skill name is required').max(100),
  proficiency: z.enum(['beginner', 'intermediate', 'expert'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const LanguageSchema = z.object({
  language:    z.string().min(1, 'Language name is required').max(100),
  proficiency: z.enum(['basic', 'conversational', 'fluent', 'native'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const ExperienceSchema = z.object({
  company_name: z.string().max(200).optional(),
  job_title:    z.string().max(150).optional(),
  start_date:   z.string().optional(),
  end_date:     z.string().nullable().optional(),
  description:  z.string().optional(),
  location:     z.string().max(150).optional(),
});

export const EducationSchema = z.object({
  institution:    z.string().max(200).optional(),
  degree:         z.string().max(100).optional(),
  field_of_study: z.string().max(150).optional(),
  start_year:     z.number().int().min(1900).max(2100).optional(),
  end_year:       z.number().int().min(1900).max(2100).optional(),
  location:       z.string().max(150).optional(),
});

export const CertificateSchema = z.object({
  name:       z.string().max(200).optional(),
  issuer:     z.string().max(200).optional(),
  issue_date: z.string().optional(),
});

// ── Create Employee ───────────────────────────────────────────────────────────

export const CreateEmployeeSchema = z.object({
  // Auth
  email:    z.string().email(),
  password: z.string().min(8).max(100),

  // Personal
  first_name:    z.string().min(1).max(100),
  last_name:     z.string().min(1).max(100),
  date_of_birth: z.string().optional(),
  gender:        z.enum(['male', 'female', 'non-binary', 'prefer_not_to_say']).optional(),
  phone:         z.string().max(30).optional(),
  bio:           z.string().max(2000).optional(),

  // Professional
  job_title:        z.string().max(150).optional(),
  occupation:       z.string().max(150).optional(),
  industry:         z.string().max(150).optional(),
  years_experience: z.number().int().min(0).max(60).optional(),
  linkedin_url:     z.string().url().optional().or(z.literal('')),

  // Location
  current_country:  z.string().max(100).optional(),
  current_city:     z.string().max(100).optional(),
  nationality:      z.string().max(100).optional(),
  target_locations: z.array(z.string()).optional(),

  // Salary — coerce so string-encoded floats from form inputs are accepted
  salary_min:      z.coerce.number().min(0).optional(),
  salary_max:      z.coerce.number().min(0).optional(),
  salary_currency: z.string().max(10).optional(),
  salary_type:     z.enum(['monthly', 'annual', 'hourly']).optional(),

  // Availability
  notice_period_id: z.coerce.number().int().positive().optional().nullable(),

  // Relations (arrays)
  skills:      z.array(SkillSchema).optional(),
  languages:   z.array(LanguageSchema).optional(),
  experience:  z.array(ExperienceSchema).optional(),
  education:   z.array(EducationSchema).optional(),
  certificates: z.array(CertificateSchema).optional(),
});

// ── Update Employee ───────────────────────────────────────────────────────────
// Also allows file URL fields so they can flow through the edit-request approval flow.

export const UpdateEmployeeSchema = CreateEmployeeSchema
  .omit({ email: true, password: true })
  .extend({
    profile_photo_url: z.string().optional().nullable(),
    resume_url:        z.string().optional().nullable(),
    intro_video_url:   z.string().optional().nullable(),
  })
  .partial();

// ── Filter/Query ──────────────────────────────────────────────────────────────

export const EmployeeFilterSchema = z.object({
  search:          z.string().optional(),
  industry:        z.string().optional(),
  occupation:      z.string().optional(),
  currentCountry:  z.string().optional(),
  skills:          z.string().optional(),       // comma-separated → split in service
  languages:       z.string().optional(),
  salaryMin:       z.coerce.number().optional(),
  salaryMax:       z.coerce.number().optional(),
  yearsExperience: z.coerce.number().optional(),
  page:            z.coerce.number().int().min(1).default(1),
  limit:           z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateEmployeeDto  = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeDto  = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeFilterDto  = z.infer<typeof EmployeeFilterSchema>;
