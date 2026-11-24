// src/modules/audit-logs/audit-logs.service.ts
import { db } from '../../config/db';
import type { AuditLogFilterDto, AuditLogExportDto } from './audit-logs.dto';

/** Shared base query: audit_logs joined with user profile tables */
function baseQuery() {
  return db('audit_logs as al')
    .leftJoin('users as u',      'u.id',        'al.user_id')
    .leftJoin('roles as rl',     'rl.id',       'u.role_id')
    .leftJoin('admins as adm',   'adm.user_id', 'al.user_id')
    .leftJoin('candidates as c', 'c.user_id',   'al.user_id')
    .leftJoin('recruiters as r', 'r.user_id',   'al.user_id')
    .select(
      'al.id',
      'al.user_id',
      db.raw(`COALESCE(
        adm.first_name || ' ' || COALESCE(adm.last_name, ''),
        c.first_name   || ' ' || COALESCE(c.last_name,   ''),
        r.contact_name
      ) AS user_name`),
      db.raw(`u.email AS user_email`),
      // user_role is derived from the roles table (not table-presence) so that
      // admin and super_admin — both of whom have an `admins` profile row —
      // are labeled distinctly rather than both showing as "Admin".
      db.raw(`CASE
        WHEN rl.name = 'admin'       THEN 'Admin'
        WHEN rl.name = 'super_admin' THEN 'Super Admin'
        WHEN rl.name = 'candidate'   THEN 'Candidate'
        WHEN rl.name = 'recruiter'   THEN 'Recruiter'
        ELSE 'System'
      END AS user_role`),
      'al.action',
      'al.resource',
      'al.resource_id',
      'al.metadata',
      'al.ip_address',
      'al.created_at',
    );
}

/** Apply shared filter clauses to a query builder */
function applyFilters(
  query: ReturnType<typeof baseQuery>,
  filters: AuditLogFilterDto | AuditLogExportDto,
) {
  const { userId, action, resource, resourceId, from, to } = filters as AuditLogFilterDto;
  if (userId)     query = query.where('al.user_id', userId);
  if (action)     query = query.whereILike('al.action', `%${action}%`);
  if (resource)   query = query.whereILike('al.resource', `%${resource}%`);
  if (resourceId) query = query.where('al.resource_id', resourceId);
  if (from)       query = query.where('al.created_at', '>=', new Date(from));
  if (to)         query = query.where('al.created_at', '<=', new Date(to));
  return query;
}

export async function listAuditLogs(filters: AuditLogFilterDto) {
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = applyFilters(baseQuery(), filters);

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

/** Export all logs matching filters (no pagination, hard cap 10,000 rows) */
export async function exportAuditLogs(filters: AuditLogExportDto) {
  const EXPORT_CAP = 10_000;
  const query = applyFilters(baseQuery(), filters);
  const rows = await query.orderBy('al.created_at', 'desc').limit(EXPORT_CAP);
  return rows as any[];
}

export async function getDistinctActions(): Promise<string[]> {
  const rows = await db('audit_logs').distinct('action').orderBy('action').select('action');
  return rows.map((r: any) => r.action as string);
}

/** Admin + super_admin users, for the super-admin audit-log "filter by admin" picker. */
export async function listAdminAndSuperAdminUsers() {
  return db('users as u')
    .join('roles as rl', 'rl.id', 'u.role_id')
    .leftJoin('admins as adm', 'adm.user_id', 'u.id')
    .whereIn('rl.name', ['admin', 'super_admin'])
    .select(
      'u.id',
      'u.email',
      db.raw(`TRIM(adm.first_name || ' ' || COALESCE(adm.last_name, '')) AS name`),
      db.raw(`rl.name AS role`),
    )
    .orderBy('name', 'asc');
}
