// src/modules/edit-requests/edit-requests.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './edit-requests.service';
import {
  SubmitEditRequestSchema,
  ReviewEditRequestSchema,
  BulkReviewEditRequestSchema,
  EditRequestFilterSchema,
} from './edit-requests.dto';
import { logAudit } from '../../services/audit.service';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// ── Candidate: submit ──────────────────────────────────────────────────────────

export async function submit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto     = SubmitEditRequestSchema.parse(req.body);
    const request = await svc.submitEditRequest(req.user!.sub, dto);
    await logAudit({
      userId: req.user!.sub, action: 'SUBMIT_EDIT_REQUEST',
      resource: 'edit_request', resourceId: request.id, ipAddress: req.ip,
    });
    res.status(201).json({ request });
  } catch (err) { next(err); }
}

// ── Candidate: get own latest request ─────────────────────────────────────────

export async function getMyRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const request = await svc.getMyPendingRequest(req.user!.sub);
    res.json({ request });
  } catch (err) { next(err); }
}

// ── Admin: list all ───────────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = EditRequestFilterSchema.parse(req.query);
    const result  = await svc.listEditRequests(filters);
    res.json(result);
  } catch (err) { next(err); }
}

// ── Admin: get single ─────────────────────────────────────────────────────────

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id      = p(req.params['id']);
    const request = await svc.getEditRequestById(id);
    res.json({ request });
  } catch (err) { next(err); }
}

// ── Admin: review (approve / reject) ─────────────────────────────────────────

export async function review(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id      = p(req.params['id']);
    const dto     = ReviewEditRequestSchema.parse(req.body);
    const request = await svc.reviewEditRequest(id, dto, req.user!.sub);
    await logAudit({
      userId: req.user!.sub, action: `EDIT_REQUEST_${dto.status.toUpperCase()}`,
      resource: 'edit_request', resourceId: id, ipAddress: req.ip,
    });
    res.json({ request });
  } catch (err) { next(err); }
}

// ── Admin: counts by status ───────────────────────────────────────────────────

export async function counts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.getEditRequestCounts();
    res.json(result);
  } catch (err) { next(err); }
}

// ── Admin: bulk review (approve / reject many) ────────────────────────────────

export async function bulkReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto    = BulkReviewEditRequestSchema.parse(req.body);
    const result = await svc.bulkReviewEditRequests(dto, req.user!.sub);
    await logAudit({
      userId: req.user!.sub, action: `EDIT_REQUEST_BULK_${dto.status.toUpperCase()}`,
      resource: 'edit_request', resourceId: dto.ids.join(','), ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) { next(err); }
}

// ── Admin: export CSV ─────────────────────────────────────────────────────────

export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = EditRequestFilterSchema.parse({ ...req.query, page: 1, limit: 9999 });
    const csv = await svc.exportEditRequests(filters);
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="edit-requests-${date}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}
