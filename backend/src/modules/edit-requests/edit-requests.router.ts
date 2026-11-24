// src/modules/edit-requests/edit-requests.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl        from './edit-requests.controller';

const router = Router();

// ── Candidate: submit + view own request ──────────────────────────────────────
router.post('/me',  authenticate, authorize('candidate'), ctrl.submit);
router.get( '/me',  authenticate, authorize('candidate'), ctrl.getMyRequest);

// ── Admin: list + review ──────────────────────────────────────────────────────
router.get(  '/',             authenticate, authorize('admin', 'super_admin'), ctrl.list);
router.get(  '/export',       authenticate, authorize('admin', 'super_admin'), ctrl.exportCsv);
router.get(  '/counts',       authenticate, authorize('admin', 'super_admin'), ctrl.counts);
router.post( '/bulk-review',  authenticate, authorize('admin', 'super_admin'), ctrl.bulkReview);
router.get(  '/:id',          authenticate, authorize('admin', 'super_admin'), ctrl.getOne);
router.patch('/:id',          authenticate, authorize('admin', 'super_admin'), ctrl.review);

export default router;
