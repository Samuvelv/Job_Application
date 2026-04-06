// src/modules/edit-requests/edit-requests.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl        from './edit-requests.controller';

const router = Router();

// ── Employee: submit + view own request ──────────────────────────────────────
router.post('/me',  authenticate, authorize('employee'), ctrl.submit);
router.get( '/me',  authenticate, authorize('employee'), ctrl.getMyRequest);

// ── Admin: list + review ──────────────────────────────────────────────────────
router.get(  '/',       authenticate, authorize('admin'), ctrl.list);
router.get(  '/:id',    authenticate, authorize('admin'), ctrl.getOne);
router.patch('/:id',    authenticate, authorize('admin'), ctrl.review);

export default router;
