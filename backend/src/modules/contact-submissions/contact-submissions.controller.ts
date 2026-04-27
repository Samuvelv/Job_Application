import { Request, Response, NextFunction } from 'express';
import * as svc from './contact-submissions.service';

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, subject, message } = req.body as Record<string, string>;
    if (!name || !email || !message) {
      res.status(400).json({ message: 'name, email, and message are required' });
      return;
    }
    const row = await svc.createSubmission({ name, email, phone, subject, message });
    res.status(201).json({ submission: row });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Math.max(1, Number(req.query['page'])  || 1);
    const limit = Math.min(50, Number(req.query['limit']) || 10);
    const result = await svc.listSubmissions(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const idParam = req.params.id;

    if (!idParam) {
    throw new Error('ID is required');
    }

    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    await svc.markRead(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
