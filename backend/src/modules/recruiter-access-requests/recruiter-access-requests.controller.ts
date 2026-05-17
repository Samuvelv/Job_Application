// src/modules/recruiter-access-requests/recruiter-access-requests.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './recruiter-access-requests.service';
import {
  SubmitRecruiterAccessRequestSchema,
  ReviewRecruiterAccessRequestSchema,
  ListRecruiterAccessRequestsSchema,
} from './recruiter-access-requests.dto';

export async function submit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = SubmitRecruiterAccessRequestSchema.parse(req.body);
    const result = await svc.submitRecruiterAccessRequest(dto);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = ListRecruiterAccessRequestsSchema.parse(req.query);
    res.json(await svc.listRecruiterAccessRequests(dto));
  } catch (e) { next(e); }
}

export async function counts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await svc.getRecruiterAccessRequestCounts());
  } catch (e) { next(e); }
}

export async function review(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = ReviewRecruiterAccessRequestSchema.parse(req.body);
    res.json(await svc.reviewRecruiterAccessRequest(String(req.params['id']), req.user!.sub, dto));
  } catch (e) { next(e); }
}
