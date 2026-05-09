// src/modules/agency-interest-requests/agency-interest-requests.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './agency-interest-requests.service';
import {
  CreateInterestRequestSchema,
  ReviewInterestRequestSchema,
  InterestRequestFilterSchema,
} from './agency-interest-requests.dto';
import { getRecruiterByUserId } from '../recruiters/recruiters.service';
import { AppError } from '../../middleware/errorHandler';

// ── Recruiter: submit interest request ──────────────────────────────────────

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recruiter = await getRecruiterByUserId(req.user!.sub);
    if ((recruiter as any).type !== 'recruitment_agency') {
      throw new AppError(403, 'Only recruitment agencies can submit interest requests.');
    }
    const dto = CreateInterestRequestSchema.parse(req.body);
    const row = await svc.createInterestRequest(recruiter.id, dto);
    res.status(201).json({ request: row });
  } catch (err) { next(err); }
}

// ── Recruiter: get own requests ──────────────────────────────────────────────

export async function getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recruiter = await getRecruiterByUserId(req.user!.sub);
    const requests = await svc.getMyInterestRequests(recruiter.id);
    res.json({ requests });
  } catch (err) { next(err); }
}

// ── Admin: list all ──────────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = InterestRequestFilterSchema.parse(req.query);
    const result  = await svc.listInterestRequests(filters);
    res.json(result);
  } catch (err) { next(err); }
}

// ── Admin: review ────────────────────────────────────────────────────────────

export async function review(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto     = ReviewInterestRequestSchema.parse(req.body);
    const updated = await svc.reviewInterestRequest(req.params['id'] as string, dto, req.user!.sub);
    res.json({ request: updated });
  } catch (err) { next(err); }
}

// ── Admin: pending count ─────────────────────────────────────────────────────

export async function pendingCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await svc.getPendingInterestRequestCount();
    res.json({ count });
  } catch (err) { next(err); }
}
