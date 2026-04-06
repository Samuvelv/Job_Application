// src/modules/employees/employees.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './employees.service';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  EmployeeFilterSchema,
} from './employees.dto';
import { logAudit } from '../../services/audit.service';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = CreateEmployeeSchema.parse(req.body);
    const employee = await svc.createEmployee(dto, req.user!.sub);
    await logAudit({
      userId: req.user!.sub, action: 'CREATE_EMPLOYEE',
      resource: 'employee', resourceId: employee.id, ipAddress: req.ip,
    });
    res.status(201).json({ employee });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = EmployeeFilterSchema.parse(req.query);
    const result  = await svc.listEmployees(filters);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    if (req.user!.role === 'employee') {
      const emp = await svc.getEmployeeByUserId(req.user!.sub);
      if (emp.id !== id) { res.status(403).json({ message: 'Access denied' }); return; }
      res.json({ employee: emp }); return;
    }
    const employee = await svc.getEmployeeById(id);
    res.json({ employee });
  } catch (err) { next(err); }
}

export async function getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await svc.getEmployeeByUserId(req.user!.sub);
    res.json({ employee });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id       = p(req.params['id']);
    const dto      = UpdateEmployeeSchema.parse(req.body);
    const employee = await svc.updateEmployee(id, dto);
    await logAudit({
      userId: req.user!.sub, action: 'UPDATE_EMPLOYEE',
      resource: 'employee', resourceId: id, ipAddress: req.ip,
    });
    res.json({ employee });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    await svc.deleteEmployee(id);
    await logAudit({
      userId: req.user!.sub, action: 'DELETE_EMPLOYEE',
      resource: 'employee', resourceId: id, ipAddress: req.ip,
    });
    res.json({ message: 'Employee deleted' });
  } catch (err) { next(err); }
}

export async function resendCreds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['id']);
    await svc.resendCredentials(id);
    await logAudit({
      userId: req.user!.sub, action: 'RESEND_CREDENTIALS',
      resource: 'employee', resourceId: id, ipAddress: req.ip,
    });
    res.json({ message: 'Credentials resent successfully' });
  } catch (err) { next(err); }
}
