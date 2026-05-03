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

export async function candidateStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.sub as string;
    const data = await statsService.getCandidateStats(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function recruiterStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.sub as string;
    const data = await statsService.getRecruiterStats(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function publicStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getPublicStats();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function notificationCounts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await statsService.getNotificationCounts();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
