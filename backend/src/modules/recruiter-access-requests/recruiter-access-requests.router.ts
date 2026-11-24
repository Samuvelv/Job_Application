// src/modules/recruiter-access-requests/recruiter-access-requests.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl        from './recruiter-access-requests.controller';

const router = Router();

// Public: submit (no auth — recruiter submits before they can log in)
router.post('/',           ctrl.submit);

// Admin: list, counts, review
router.get( '/',           authenticate, authorize('admin', 'super_admin'), ctrl.list);
router.get( '/counts',     authenticate, authorize('admin', 'super_admin'), ctrl.counts);
router.put( '/:id/review', authenticate, authorize('admin', 'super_admin'), ctrl.review);

export default router;
