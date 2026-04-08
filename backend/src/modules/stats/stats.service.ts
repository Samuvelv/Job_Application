// src/modules/stats/stats.service.ts
import { db } from '../../config/db';

const toCount = (row: any): number => Number(row?.count ?? 0);

export async function getAdminStats() {
  const [employees, recruiters, pendingEdits, auditLogsToday] = await Promise.all([
    db('employees').count('id as count').first(),
    db('users').where({ role_id: db('roles').select('id').where({ name: 'recruiter' }) }).count('id as count').first(),
    db('profile_edit_requests').where({ status: 'pending' }).count('id as count').first(),
    db('audit_logs').whereRaw('DATE(created_at) = CURRENT_DATE').count('id as count').first(),
  ]);

  return {
    employees:      toCount(employees),
    recruiters:     toCount(recruiters),
    pendingEdits:   toCount(pendingEdits),
    auditLogsToday: toCount(auditLogsToday),
  };
}

export async function getEmployeeStats(userId: string) {
  const employee = await db('employees').where({ user_id: userId }).first();
  if (!employee) return { profileCompleteness: 0, pendingRequest: false };

  const fields = [
    employee.phone, employee.date_of_birth,
    employee.nationality, employee.bio,
  ];
  const filled = fields.filter(Boolean).length;
  const profileCompleteness = Math.round((filled / fields.length) * 100);

  const pendingRequest = !!(await db('profile_edit_requests')
    .where({ employee_id: employee.id, status: 'pending' })
    .first());

  return { profileCompleteness, pendingRequest };
}

export async function getRecruiterStats(userId: string) {
  await db('users').where({ id: userId }).first();

  const [shortlistCount, candidatesAvailable] = await Promise.all([
    db('shortlists').where({ recruiter_id: userId }).count('id as count').first(),
    db('employees').count('id as count').first(),
  ]);

  return {
    shortlistCount:      toCount(shortlistCount),
    candidatesAvailable: toCount(candidatesAvailable),
  };
}
