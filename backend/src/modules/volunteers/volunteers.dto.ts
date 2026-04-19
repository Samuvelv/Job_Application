// src/modules/volunteers/volunteers.dto.ts
import { z } from 'zod';

export const CreateVolunteerSchema = z.object({
  name:  z.string().min(1, 'Name is required').max(200),
  email: z.string().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().max(50).optional(),
  role:  z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateVolunteerSchema = CreateVolunteerSchema.partial();

export type CreateVolunteerDto = z.infer<typeof CreateVolunteerSchema>;
export type UpdateVolunteerDto = z.infer<typeof UpdateVolunteerSchema>;
