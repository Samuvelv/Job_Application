// src/modules/volunteer-support-requests/volunteer-support-requests.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { logAudit } from '../../services/audit.service';
import * as svc from './volunteer-support-requests.service';
import {
  CreateSupportRequestSchema,
  ReviewSupportRequestSchema,
  SupportRequestFilterSchema,
} from './volunteer-support-requests.dto';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto         = CreateSupportRequestSchema.parse(req.body);
    const volunteerId = req.params['volunteerId'] as string;
    const row = await svc.createSupportRequest(req.user!.sub, volunteerId, dto);
    logAudit({
      userId:     req.user!.sub,
      action:     'VOLUNTEER_SUPPORT_REQUEST',
      resource:   'volunteer_support_request',
      resourceId: row.id,
      ipAddress:  req.ip,
      metadata:   { volunteerId, message: dto.message ?? null },
    }).catch(() => {});
    res.status(201).json({ supportRequest: row });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = SupportRequestFilterSchema.parse(req.query);
    const result  = await svc.listSupportRequests(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function review(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id      = req.params['id'] as string;
    const dto     = ReviewSupportRequestSchema.parse(req.body);
    const updated = await svc.reviewSupportRequest(id, dto);
    logAudit({
      userId:     req.user!.sub,
      action:     'VOLUNTEER_SUPPORT_REVIEWED',
      resource:   'volunteer_support_request',
      resourceId: id,
      ipAddress:  req.ip,
      metadata:   { status: dto.status, adminNote: dto.admin_note ?? null },
    }).catch(() => {});
    res.json({ supportRequest: updated });
  } catch (err) {
    next(err);
  }
}

export async function getCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const counts = await svc.getSupportRequestCounts();
    res.json(counts);
  } catch (err) {
    next(err);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await svc.getMySupportRequests(req.user!.sub);
    res.json({ supportRequests: rows });
  } catch (err) {
    next(err);
  }
}
