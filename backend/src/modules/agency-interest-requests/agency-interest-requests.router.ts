// src/modules/agency-interest-requests/agency-interest-requests.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl from './agency-interest-requests.controller';

const router = Router();
router.use(authenticate);

// Admin: pending count (before /:id to avoid param clash)
router.get('/pending-count', authorize('admin'), ctrl.pendingCount);

// Recruiter: get own requests
router.get('/me', authorize('recruiter'), ctrl.getMyRequests);

// Admin: export CSV (before GET / to avoid param clash)
router.get('/export', authorize('admin'), ctrl.exportCsv);

// Admin: list all
router.get('/', authorize('admin'), ctrl.list);

// Recruiter: submit new interest request
router.post('/', authorize('recruiter'), ctrl.create);

// Admin: approve / reject
router.patch('/:id/review', authorize('admin'), ctrl.review);

export default router;
