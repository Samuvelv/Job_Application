// src/modules/candidates/candidates.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './candidates.service';
import {
  CreateCandidateSchema,
  UpdateCandidateSchema,
  CandidateFilterSchema,
  BulkActionSchema,
} from './candidates.dto';
import { logAudit } from '../../services/audit.service';
import { isContactUnlocked } from '../contact-requests/contact-requests.service';
import { getRecruiterByUserId } from '../recruiters/recruiters.service';
import { db } from '../../config/db';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// ── Candidate activity / history ──────────────────────────────────────────────
export async function getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activity = await db('candidate_activity')
      .where({ candidate_id: req.params['id'] })
      .orderBy('created_at', 'desc');
    res.json({ activity });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = CreateCandidateSchema.parse(req.body);
    const candidate = await svc.createCandidate(dto, req.user!.sub);
    await logAudit({
      userId: req.user!.sub, action: 'CREATE_EMPLOYEE',
      resource: 'candidate', resourceId: candidate.id, ipAddress: req.ip,
      metadata: { candidate_name: `${candidate.first_name} ${candidate.last_name}` },
    });
    res.status(201).json({ candidate });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = CandidateFilterSchema.parse(req.query);
    const result  = await svc.listCandidates(filters);
    // Strip sensitive fields from recruiter responses
    if (req.user!.role === 'recruiter') {
      result.data = result.data.map(({ plain_password, ...rest }: any) => rest);
    }
    res.json(result);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    if (req.user!.role === 'candidate') {
      const emp = await svc.getCandidateByUserId(req.user!.sub);
      if (emp.id !== id) { res.status(403).json({ message: 'Access denied' }); return; }
      const { referrals: _r, ...empPublic } = emp as any;
      res.json({ candidate: empPublic }); return;
    }

    const candidate = await svc.getCandidateById(id);

    // Recruiters: mask contact fields unless they have an approved unlock request
    if (req.user!.role === 'recruiter') {
      const recruiter = await getRecruiterByUserId(req.user!.sub);
      // Recruitment agencies never get contact fields — they must use the interest request workflow
      const isAgency  = (recruiter as any).type === 'recruitment_agency';
      const unlocked  = isAgency ? false : await isContactUnlocked(recruiter.id, id);
      const masked    = {
        ...candidate,
        plain_password: undefined, // never expose to recruiters
        referrals:      undefined, // admin-only
        contact_locked:   !unlocked,
        email:            unlocked ? candidate.email            : null,
        phone:            unlocked ? candidate.phone            : null,
        linkedin_url:     unlocked ? candidate.linkedin_url     : null,
        whatsapp_number:  unlocked ? candidate.whatsapp_number  : null,
      };
      res.json({ candidate: masked }); return;
    }

    res.json({ candidate });
  } catch (err) { next(err); }
}

export async function getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = await svc.getCandidateByUserId(req.user!.sub);
    res.json({ candidate });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id       = p(req.params['id']);
    const dto      = UpdateCandidateSchema.parse(req.body);
    const candidate = await svc.updateCandidate(id, dto);
    // Derive human-readable list of changed top-level fields (exclude internal keys)
    const SKIP_FIELDS = new Set(['new_password', 'skills', 'languages', 'experience', 'education', 'certificates']);
    const changedFields = Object.keys(dto).filter(k => !SKIP_FIELDS.has(k));
    // Also note if relation arrays were touched
    const relations = (['skills', 'languages', 'experience', 'education', 'certificates'] as const)
      .filter(k => k in dto);
    const allFields = [...changedFields, ...relations];
    await logAudit({
      userId: req.user!.sub, action: 'UPDATE_EMPLOYEE',
      resource: 'candidate', resourceId: id, ipAddress: req.ip,
      metadata: {
        candidate_name: `${(candidate as any).first_name} ${(candidate as any).last_name}`,
        updated_fields: allFields.length ? allFields : ['(unspecified)'],
      },
    });
    res.json({ candidate });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    // Fetch name before deleting so we can log it
    const existing = await db('candidates').where({ id }).select('first_name', 'last_name').first();
    await svc.deleteCandidate(id);
    await logAudit({
      userId: req.user!.sub, action: 'DELETE_EMPLOYEE',
      resource: 'candidate', resourceId: id, ipAddress: req.ip,
      metadata: existing
        ? { candidate_name: `${existing.first_name} ${existing.last_name}` }
        : undefined,
    });
    res.json({ message: 'Candidate deleted' });
  } catch (err) { next(err); }
}

export async function resendCreds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const existing = await db('candidates').where({ id }).select('first_name', 'last_name').first();
    await svc.resendCredentials(id);
    await logAudit({
      userId: req.user!.sub, action: 'RESEND_CREDENTIALS',
      resource: 'candidate', resourceId: id, ipAddress: req.ip,
      metadata: existing
        ? { candidate_name: `${existing.first_name} ${existing.last_name}` }
        : { candidate_id: id },
    });
    res.json({ message: 'Credentials resent successfully' });
  } catch (err) { next(err); }
}

export async function inviteVolunteer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const result = await svc.inviteAsVolunteer(id);
    // Fetch candidate name for richer audit trail
    const existing = await db('candidates').where({ id }).select('first_name', 'last_name').first();
    await logAudit({
      userId: req.user!.sub, action: 'INVITE_VOLUNTEER',
      resource: 'candidate', resourceId: id, ipAddress: req.ip,
      metadata: existing
        ? { candidate_name: `${existing.first_name} ${existing.last_name}` }
        : { candidate_id: id },
    });
    res.json(result);
  } catch (err) { next(err); }
}

export async function bulkActionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = BulkActionSchema.parse(req.body);
    const result = await svc.bulkAction(dto.candidateIds, dto.action, dto.payload);
    await logAudit({
      userId: req.user!.sub,
      action: `BULK_${dto.action.toUpperCase()}`,
      resource: 'candidate',
      ipAddress: req.ip,
      metadata: { count: result.updated, action: dto.action },
    });
    res.json({ message: `${result.updated} candidate${result.updated === 1 ? '' : 's'} updated`, updated: result.updated });
  } catch (err) { next(err); }
}

const CV_FORMAT_LABELS: Record<string, string> = {
  uk_format:         'UK Format',
  european_format:   'European Format',
  canadian_format:   'Canadian Format',
  australian_format: 'Australian Format',
  gulf_format:       'Gulf Format',
  asian_format:      'Asian Format',
  not_yet_created:   'Not Yet Created',
  others:            'CV Format - Others',
};

function csvEscape(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = CandidateFilterSchema.parse(req.query);
    const rows = await svc.exportCandidates(filters);

    const headers = [
      'Candidate No', 'First Name', 'Last Name', 'Email', 'Phone',
      'Current Country', 'Target Countries', 'Profile Status',
      'Registration Fee Status', 'CV Format', 'Created Date',
    ];

    const lines = [
      headers.join(','),
      ...(rows as any[]).map((r) => [
        csvEscape(r.candidate_number),
        csvEscape(r.first_name),
        csvEscape(r.last_name),
        csvEscape(r.email),
        csvEscape(r.phone),
        csvEscape(r.current_country),
        csvEscape(Array.isArray(r.target_locations) ? r.target_locations.join('; ') : r.target_locations),
        csvEscape(r.profile_status),
        csvEscape(r.registration_fee_status),
        csvEscape(r.cv_format ? (CV_FORMAT_LABELS[r.cv_format] ?? r.cv_format) : ''),
        csvEscape(r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''),
      ].join(',')),
    ];

    const filename = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\r\n'));
  } catch (err) { next(err); }
}
