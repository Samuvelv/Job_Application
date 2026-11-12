// src/modules/admin-management/admin-management.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './admin-management.service';
import { CreateAdminSchema, AdminFilterSchema } from './admin-management.dto';
import { logAudit } from '../../services/audit.service';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = CreateAdminSchema.parse(req.body);
    const admin = await svc.createAdmin(dto);
    await logAudit({
      userId: req.user!.sub, action: 'CREATE_ADMIN',
      resource: 'admin', resourceId: admin.id, ipAddress: req.ip,
      metadata: { email: admin.email, first_name: admin.first_name, last_name: admin.last_name },
    });
    res.status(201).json({ admin });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = AdminFilterSchema.parse(req.query);
    const result = await svc.listAdmins(filters);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const admin = await svc.getAdminById(id);
    res.json({ admin });
  } catch (err) { next(err); }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const admin = await svc.setAdminActive(id, false);
    await logAudit({
      userId: req.user!.sub, action: 'DEACTIVATE_ADMIN',
      resource: 'admin', resourceId: id, ipAddress: req.ip,
      metadata: { email: admin.email, first_name: admin.first_name, last_name: admin.last_name },
    });
    res.json({ admin });
  } catch (err) { next(err); }
}

export async function reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const admin = await svc.setAdminActive(id, true);
    await logAudit({
      userId: req.user!.sub, action: 'REACTIVATE_ADMIN',
      resource: 'admin', resourceId: id, ipAddress: req.ip,
      metadata: { email: admin.email, first_name: admin.first_name, last_name: admin.last_name },
    });
    res.json({ admin });
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    const admin = await svc.resetAdminPassword(id);
    await logAudit({
      userId: req.user!.sub, action: 'RESET_ADMIN_PASSWORD',
      resource: 'admin', resourceId: id, ipAddress: req.ip,
      metadata: { email: admin.email, first_name: admin.first_name, last_name: admin.last_name },
    });
    res.json({ message: 'Password reset — new credentials emailed to the admin.' });
  } catch (err) { next(err); }
}
