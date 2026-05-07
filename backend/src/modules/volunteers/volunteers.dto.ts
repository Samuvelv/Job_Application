// src/modules/volunteers/volunteers.dto.ts
import { z } from 'zod';

const SUPPORT_METHODS = ['WhatsApp Support', 'Phone Call Support', 'Platform Messaging Only'] as const;
const CONTACT_PREFS   = ['WhatsApp', 'Email', 'Platform Only'] as const;
const AVAILABILITIES  = ['Active', 'Temporarily Unavailable'] as const;

export const CreateVolunteerSchema = z.object({
  name:               z.string().min(1, 'Name is required').max(200),
  email:              z.string().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  phone:              z.string().max(50).optional(),
  role:               z.string().max(200).optional(),
  notes:              z.string().max(2000).optional(),
  // Extended fields
  photo_url:          z.string().max(500).optional(),
  nationality:        z.string().max(200).optional(),
  country_placed:     z.string().max(200).optional(),
  company_joined:     z.string().max(200).optional(),
  year_placed:        z.number().int().min(1990).max(new Date().getFullYear()).optional(),
  languages:          z.array(z.string().max(100)).optional(),
  success_story:      z.string().max(1000).optional(),
  support_method:     z.enum(SUPPORT_METHODS).optional(),
  contact_preference: z.enum(CONTACT_PREFS).optional(),
  availability:       z.enum(AVAILABILITIES).optional(),
  consent:            z.boolean().optional(),
  candidates_helped:  z.number().int().min(0).optional(),
});

export const UpdateVolunteerSchema = CreateVolunteerSchema.partial();

export type CreateVolunteerDto = z.infer<typeof CreateVolunteerSchema>;
export type UpdateVolunteerDto = z.infer<typeof UpdateVolunteerSchema>;
