// src/modules/contact-requests/contact-requests.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as svc from './contact-requests.service';
import { ReviewContactRequestSchema, BulkReviewContactRequestSchema, ContactRequestFilterSchema, RevokeContactRequestSchema, CreateContactRequestSchema } from './contact-requests.dto';
import { getRecruiterByUserId } from '../recruiters/recruiters.service';

const router = Router();
router.use(authenticate);

// Admin: get counts by status (must be before /:candidateId)
router.get('/counts',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await svc.getContactRequestCounts();
      res.json(result);
    } catch (err) { next(err); }
  },
);

// Admin: bulk approve or reject (must be before /:candidateId to avoid param clash)
router.post('/bulk-review',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto    = BulkReviewContactRequestSchema.parse(req.body);
      const result = await svc.bulkReviewContactRequests(dto, req.user!.sub);
      res.json(result);
    } catch (err) { next(err); }
  },
);

// Recruiter: submit a request for a candidate's contact info
// Recruitment agencies must use /api/v1/interest-requests instead
router.post('/:candidateId',
  authorize('recruiter'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recruiter = await getRecruiterByUserId(req.user!.sub);
      if ((recruiter as any).type === 'recruitment_agency') {
        res.status(403).json({ message: 'Recruitment agencies cannot use this endpoint. Please submit an Interest Request instead.' });
        return;
      }
      const dto = CreateContactRequestSchema.parse(req.body);
      const row = await svc.createContactRequest(recruiter.id, req.params['candidateId'] as string, dto);
      res.status(201).json({ request: row });
    } catch (err) { next(err); }
  },
);

// Recruiter: get own requests (to check status per candidate)
router.get('/me',
  authorize('recruiter'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recruiter = await getRecruiterByUserId(req.user!.sub);
      const requests = await svc.getMyContactRequests(recruiter.id);
      res.json({ requests });
    } catch (err) { next(err); }
  },
);

// Admin: export CSV (must be before /:candidateId to avoid param clash)
router.get('/export',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page: _p, limit: _l, ...filters } = ContactRequestFilterSchema.parse({ ...req.query, page: 1, limit: 20 });
      const csv  = await svc.exportContactRequests(filters);
      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contact-info-requests-${date}.csv"`);
      res.send(csv);
    } catch (err) { next(err); }
  },
);

// Admin: list all contact requests
router.get('/',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = ContactRequestFilterSchema.parse(req.query);
      const result  = await svc.listContactRequests(filters);
      res.json(result);
    } catch (err) { next(err); }
  },
);

// Admin: revoke an approved request
router.post('/:id/revoke',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto     = RevokeContactRequestSchema.parse(req.body);
      const updated = await svc.revokeContactRequest(req.params['id'] as string, dto, req.user!.sub);
      res.json({ request: updated });
    } catch (err) { next(err); }
  },
);

// Admin: approve or reject a request
router.put('/:id/review',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto     = ReviewContactRequestSchema.parse(req.body);
      const updated = await svc.reviewContactRequest(req.params['id'] as string, dto, req.user!.sub);
      res.json({ request: updated });
    } catch (err) { next(err); }
  },
);

export default router;
