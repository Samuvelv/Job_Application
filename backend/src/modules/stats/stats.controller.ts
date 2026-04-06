// src/modules/stats/stats.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as statsService from './stats.service';

export async function adminStats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getAdminStats();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function employeeStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id as string;
    const data = await statsService.getEmployeeStats(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function recruiterStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id as string;
    const data = await statsService.getRecruiterStats(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
