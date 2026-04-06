// src/modules/audit-logs/audit-logs.service.ts
import { db } from '../../config/db';
import type { AuditLogFilterDto } from './audit-logs.dto';

export async function listAuditLogs(filters: AuditLogFilterDto) {
  const { page, limit, userId, action, resource, resourceId, from, to } = filters;
  const offset = (page - 1) * limit;

  let query = db('audit_logs as al')
    .leftJoin('users as u', 'u.id', 'al.user_id')
    .select(
      'al.id',
      'al.user_id',
      'u.email as user_email',
      'al.action',
      'al.resource',
      'al.resource_id',
      'al.metadata',
      'al.ip_address',
      'al.created_at',
    );

  if (userId)     query = query.where('al.user_id', userId);
  if (action)     query = query.whereILike('al.action', `%${action}%`);
  if (resource)   query = query.whereILike('al.resource', `%${resource}%`);
  if (resourceId) query = query.where('al.resource_id', resourceId);
  if (from)       query = query.where('al.created_at', '>=', new Date(from));
  if (to)         query = query.where('al.created_at', '<=', new Date(to));

  const countQuery = query.clone().clearSelect().count('al.id as total').first();
  const [rows, countRow] = await Promise.all([
    query.orderBy('al.created_at', 'desc').limit(limit).offset(offset),
    countQuery,
  ]);

  const total = Number((countRow as any)?.total ?? 0);
  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getDistinctActions(): Promise<string[]> {
  const rows = await db('audit_logs').distinct('action').orderBy('action').select('action');
  return rows.map((r: any) => r.action as string);
}
