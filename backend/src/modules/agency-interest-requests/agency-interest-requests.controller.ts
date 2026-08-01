// src/modules/agency-interest-requests/agency-interest-requests.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './agency-interest-requests.service';
import {
  CreateInterestRequestSchema,
  ReviewInterestRequestSchema,
  RevokeInterestRequestSchema,
  InterestRequestFilterSchema,
} from './agency-interest-requests.dto';
import { getRecruiterByUserId } from '../recruiters/recruiters.service';
import { logAudit } from '../../services/audit.service';

// ── Recruiter: submit interest request ──────────────────────────────────────

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const recruiter = await getRecruiterByUserId(req.user!.sub);
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

// ── Admin: review (approve / reject) ────────────────────────────────────────

export async function review(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto     = ReviewInterestRequestSchema.parse(req.body);
    const updated = await svc.reviewInterestRequest(req.params['id'] as string, dto, req.user!.sub);
    res.json({ request: updated });
  } catch (err) { next(err); }
}

// ── Admin: revoke an approved request ───────────────────────────────────────

export async function revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id      = req.params['id'] as string;
    const dto     = RevokeInterestRequestSchema.parse(req.body);
    const updated = await svc.revokeInterestRequest(id, dto, req.user!.sub);

    await logAudit({
      userId:     req.user!.sub,
      action:     'INTEREST_REQUEST_REVOKED',
      resource:   'agency_interest_request',
      resourceId: id,
      ipAddress:  req.ip,
      metadata: {
        agency_name:        (updated as any).recruiter_company ?? null,
        revocation_reason:  dto.reason ?? null,
      },
    });

    res.json({ request: updated });
  } catch (err) { next(err); }
}

// ── Admin: status counts ─────────────────────────────────────────────────────

export async function counts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.getInterestRequestCounts();
    res.json(result);
  } catch (err) { next(err); }
}

// ── Admin: pending count ─────────────────────────────────────────────────────

export async function pendingCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await svc.getPendingInterestRequestCount();
    res.json({ count });
  } catch (err) { next(err); }
}

// ── Admin: export CSV ────────────────────────────────────────────────────────

export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page: _p, limit: _l, ...filters } = InterestRequestFilterSchema.parse({ ...req.query, page: 1, limit: 20 });
    const csv  = await svc.exportInterestRequests(filters);
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="agency-interest-requests-${date}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}
