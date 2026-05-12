// src/modules/audit-logs/audit-logs.dto.ts
import { z } from 'zod';

export const AuditLogFilterSchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(25),
  userId:     z.string().uuid().optional(),
  action:     z.string().max(100).optional(),
  resource:   z.string().max(100).optional(),
  resourceId: z.string().uuid().optional(),
  from:       z.string().optional(), // ISO date string
  to:         z.string().optional(), // ISO date string
});

export type AuditLogFilterDto = z.infer<typeof AuditLogFilterSchema>;

// Export schema: same filters but no pagination (exports all matching rows)
export const AuditLogExportSchema = z.object({
  userId:     z.string().uuid().optional(),
  action:     z.string().max(100).optional(),
  resource:   z.string().max(100).optional(),
  resourceId: z.string().uuid().optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
});

export type AuditLogExportDto = z.infer<typeof AuditLogExportSchema>;
