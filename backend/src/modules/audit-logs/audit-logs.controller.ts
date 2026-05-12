// src/modules/audit-logs/audit-logs.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuditLogFilterSchema, AuditLogExportSchema } from './audit-logs.dto';
import { listAuditLogs, exportAuditLogs, getDistinctActions } from './audit-logs.service';

/** Escape a value for safe CSV inclusion */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Wrap in quotes if the value contains a comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Map an action string to a human-readable description */
function describeAction(action: string): string {
  const map: Record<string, string> = {
    LOGIN:                           'User logged into the platform',
    LOGOUT:                          'User logged out of the platform',
    CREATE_EMPLOYEE:                 'Created a new candidate profile',
    UPDATE_EMPLOYEE:                 'Updated candidate profile details',
    DELETE_EMPLOYEE:                 'Deleted a candidate profile',
    RESEND_CREDENTIALS:              'Resent login credentials to candidate',
    INVITE_VOLUNTEER:                'Invited candidate to volunteer programme',
    BULK_ACTIVATE:                   'Bulk activated candidate accounts',
    BULK_DEACTIVATE:                 'Bulk deactivated candidate accounts',
    CREATE_RECRUITER:                'Created a new recruiter account',
    UPDATE_RECRUITER:                'Updated recruiter account details',
    DELETE_RECRUITER:                'Deleted a recruiter account',
    RESEND_RECRUITER_CREDENTIALS:    'Resent login credentials to recruiter',
    BULK_ACTIVATE_RECRUITERS:        'Bulk activated recruiter accounts',
    BULK_DEACTIVATE_RECRUITERS:      'Bulk deactivated recruiter accounts',
    SUBMIT_EDIT_REQUEST:             'Candidate submitted a profile edit request',
    EDIT_REQUEST_APPROVED:           'Edit request was approved',
    EDIT_REQUEST_REJECTED:           'Edit request was rejected',
    EDIT_REQUEST_BULK_APPROVED:      'Bulk approved profile edit requests',
    EDIT_REQUEST_BULK_REJECTED:      'Bulk rejected profile edit requests',
    CREATE_AGENCY_REFERRAL:          'Added an agency referral record',
    UPDATE_AGENCY_REFERRAL:          'Updated an agency referral record',
    DELETE_AGENCY_REFERRAL:          'Deleted an agency referral record',
    INTEREST_REQUEST_REVOKED:        'Agency interest request was revoked',
    NEW_IP_LOGIN_DETECTED:           'New IP address detected on admin login',
    OTP_GENERATED:                   'One-time passcode generated for admin login',
    OTP_VERIFIED:                    'Admin two-factor authentication verified',
    OTP_FAILED:                      'Incorrect OTP entered during admin login',
    OTP_RESENT:                      'One-time passcode resent to admin',
    OTP_LOCKED:                      'Admin OTP verification locked after too many attempts',
  };
  if (map[action]) return map[action];
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a timestamp as "YYYY-MM-DD HH:mm:ss" (UTC) */
function formatTimestamp(ts: unknown): string {
  if (!ts) return '';
  try {
    const d = new Date(ts as string);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
           `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  } catch {
    return String(ts);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = AuditLogFilterSchema.parse(req.query);
    const result  = await listAuditLogs(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = AuditLogExportSchema.parse(req.query);
    const rows    = await exportAuditLogs(filters);

    const headers = [
      'Timestamp (UTC)',
      'User Name',
      'User Email',
      'User Role',
      'Action',
      'Action Description',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'Metadata',
    ];

    const lines = [
      headers.join(','),
      ...rows.map((r: any) => [
        csvEscape(formatTimestamp(r.created_at)),
        csvEscape(r.user_name  || 'System'),
        csvEscape(r.user_email || ''),
        csvEscape(r.user_role  || 'System'),
        csvEscape(r.action),
        csvEscape(describeAction(r.action)),
        csvEscape(r.resource    || ''),
        csvEscape(r.resource_id || ''),
        csvEscape(r.ip_address  || ''),
        csvEscape(r.metadata ? JSON.stringify(r.metadata) : ''),
      ].join(',')),
    ];

    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\r\n'));
  } catch (err) {
    next(err);
  }
}

export async function actions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getDistinctActions();
    res.json({ actions: result });
  } catch (err) {
    next(err);
  }
}
