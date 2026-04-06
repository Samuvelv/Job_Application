// src/modules/stats/stats.service.ts
import { db } from '../../config/db';

export async function getAdminStats() {
  const [
    { count: employees },
    { count: recruiters },
    { count: pendingEdits },
    { count: auditLogsToday },
  ] = await Promise.all([
    db('employees').count('id as count').first(),
    db('users').where({ role_id: db('roles').select('id').where({ name: 'recruiter' }) }).count('id as count').first(),
    db('edit_requests').where({ status: 'pending' }).count('id as count').first(),
    db('audit_logs')
      .whereRaw("DATE(created_at) = CURRENT_DATE")
      .count('id as count')
      .first(),
  ]);

  return {
    employees:      Number(employees  ?? 0),
    recruiters:     Number(recruiters ?? 0),
    pendingEdits:   Number(pendingEdits    ?? 0),
    auditLogsToday: Number(auditLogsToday ?? 0),
  };
}

export async function getEmployeeStats(userId: string) {
  const employee = await db('employees').where({ user_id: userId }).first();
  if (!employee) return { profileCompleteness: 0, pendingRequest: false };

  // Completeness: count filled optional fields
  const fields = [
    employee.phone, employee.address, employee.date_of_birth,
    employee.nationality, employee.summary,
  ];
  const filled = fields.filter(Boolean).length;
  const profileCompleteness = Math.round((filled / fields.length) * 100);

  const pendingRequest = !!(await db('edit_requests')
    .where({ employee_id: employee.id, status: 'pending' })
    .first());

  return { profileCompleteness, pendingRequest };
}

export async function getRecruiterStats(userId: string) {
  const recruiter = await db('users').where({ id: userId }).first();

  const [
    { count: shortlistCount },
    { count: candidatesAvailable },
  ] = await Promise.all([
    db('shortlists').where({ recruiter_id: userId }).count('id as count').first(),
    db('employees').count('id as count').first(),
  ]);

  return {
    shortlistCount:      Number(shortlistCount      ?? 0),
    candidatesAvailable: Number(candidatesAvailable ?? 0),
  };
}
