// src/modules/admin-management/admin-management.dto.ts
import { z } from 'zod';

export const CreateAdminSchema = z.object({
  email:      z.string().email(),
  first_name: z.string().min(1).max(100),
  last_name:  z.string().max(100).optional(),
  password:   z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const AdminFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

export type CreateAdminDto = z.infer<typeof CreateAdminSchema>;
export type AdminFilterDto = z.infer<typeof AdminFilterSchema>;
