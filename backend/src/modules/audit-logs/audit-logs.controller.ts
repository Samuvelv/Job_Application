// src/modules/audit-logs/audit-logs.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuditLogFilterSchema } from './audit-logs.dto';
import { listAuditLogs, getDistinctActions } from './audit-logs.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = AuditLogFilterSchema.parse(req.query);
    const result  = await listAuditLogs(filters);
    res.json(result);
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
