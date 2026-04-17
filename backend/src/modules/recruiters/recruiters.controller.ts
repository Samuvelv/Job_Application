// src/modules/recruiters/recruiters.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './recruiters.service';
import {
  CreateRecruiterSchema,
  UpdateRecruiterSchema,
  RecruiterFilterSchema,
} from './recruiters.dto';
import { logAudit } from '../../services/audit.service';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// ── Admin: CRUD ───────────────────────────────────────────────────────────────

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = CreateRecruiterSchema.parse(req.body);
    const result = await svc.createRecruiter(dto, req.user!.sub);
    await logAudit({
      userId: req.user!.sub, action: 'CREATE_RECRUITER',
      resource: 'recruiter', resourceId: result.recruiter.id, ipAddress: req.ip,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = RecruiterFilterSchema.parse(req.query);
    const result  = await svc.listRecruiters(filters);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const recruiter = await svc.getRecruiterById(id);
    res.json({ recruiter });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id  = p(req.params['id']);
    const dto = UpdateRecruiterSchema.parse(req.body);
    const recruiter = await svc.updateRecruiter(id, dto);
    await logAudit({
      userId: req.user!.sub, action: 'UPDATE_RECRUITER',
      resource: 'recruiter', resourceId: id, ipAddress: req.ip,
    });
    res.json({ recruiter });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    await svc.deleteRecruiter(id);
    await logAudit({
      userId: req.user!.sub, action: 'DELETE_RECRUITER',
      resource: 'recruiter', resourceId: id, ipAddress: req.ip,
    });
    res.json({ message: 'Recruiter deleted' });
  } catch (err) { next(err); }
}

// ── Admin: Resend credentials ─────────────────────────────────────────────────

export async function resendCreds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    await svc.resendCredentials(id);
    await logAudit({
      userId: req.user!.sub, action: 'RESEND_RECRUITER_CREDENTIALS',
      resource: 'recruiter', resourceId: id, ipAddress: req.ip,
    });
    res.json({ message: 'Credentials resent' });
  } catch (err) { next(err); }
}

// ── Recruiter: self ───────────────────────────────────────────────────────────

export async function getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recruiter = await svc.getRecruiterByUserId(req.user!.sub);
    res.json({ recruiter });
  } catch (err) { next(err); }
}

// ── Recruiter: shortlist ──────────────────────────────────────────────────────

export async function getShortlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recruiter = await svc.getRecruiterByUserId(req.user!.sub);
    const shortlist = await svc.getShortlist(recruiter.id);
    res.json({ shortlist });
  } catch (err) { next(err); }
}

export async function getShortlistById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const shortlist = await svc.getShortlist(id);
    res.json({ shortlist });
  } catch (err) { next(err); }
}

export async function addShortlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recruiter  = await svc.getRecruiterByUserId(req.user!.sub);
    const candidateId = p(req.params['candidateId']);
    const { notes }  = req.body as { notes?: string };
    const entry = await svc.addToShortlist(recruiter.id, candidateId, notes);
    res.status(201).json({ entry });
  } catch (err) { next(err); }
}

export async function removeShortlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recruiter  = await svc.getRecruiterByUserId(req.user!.sub);
    const candidateId = p(req.params['candidateId']);
    await svc.removeFromShortlist(recruiter.id, candidateId);
    res.json({ message: 'Removed from shortlist' });
  } catch (err) { next(err); }
}
