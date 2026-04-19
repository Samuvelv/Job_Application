// src/modules/candidates/candidates.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './candidates.service';
import {
  CreateCandidateSchema,
  UpdateCandidateSchema,
  CandidateFilterSchema,
} from './candidates.dto';
import { logAudit } from '../../services/audit.service';
import { isContactUnlocked } from '../contact-requests/contact-requests.service';
import { getRecruiterByUserId } from '../recruiters/recruiters.service';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = CreateCandidateSchema.parse(req.body);
    const candidate = await svc.createCandidate(dto, req.user!.sub);
    await logAudit({
      userId: req.user!.sub, action: 'CREATE_EMPLOYEE',
      resource: 'candidate', resourceId: candidate.id, ipAddress: req.ip,
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
      res.json({ candidate: emp }); return;
    }

    const candidate = await svc.getCandidateById(id);

    // Recruiters: mask contact fields unless they have an approved unlock request
    if (req.user!.role === 'recruiter') {
      const recruiter = await getRecruiterByUserId(req.user!.sub);
      const unlocked  = await isContactUnlocked(recruiter.id, id);
      const masked    = {
        ...candidate,
        plain_password: undefined, // never expose to recruiters
        contact_locked: !unlocked,
        email:       unlocked ? candidate.email       : null,
        phone:       unlocked ? candidate.phone       : null,
        linkedin_url:unlocked ? candidate.linkedin_url: null,
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
    await logAudit({
      userId: req.user!.sub, action: 'UPDATE_EMPLOYEE',
      resource: 'candidate', resourceId: id, ipAddress: req.ip,
    });
    res.json({ candidate });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    await svc.deleteCandidate(id);
    await logAudit({
      userId: req.user!.sub, action: 'DELETE_EMPLOYEE',
      resource: 'candidate', resourceId: id, ipAddress: req.ip,
    });
    res.json({ message: 'Candidate deleted' });
  } catch (err) { next(err); }
}

export async function resendCreds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    await svc.resendCredentials(id);
    await logAudit({
      userId: req.user!.sub, action: 'RESEND_CREDENTIALS',
      resource: 'candidate', resourceId: id, ipAddress: req.ip,
    });
    res.json({ message: 'Credentials resent successfully' });
  } catch (err) { next(err); }
}
