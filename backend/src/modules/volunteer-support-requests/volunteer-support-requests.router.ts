// src/modules/volunteer-support-requests/volunteer-support-requests.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl from './volunteer-support-requests.controller';

const router = Router();
router.use(authenticate);

// Admin: counts (before /:id to avoid param clash)
router.get('/counts', authorize('admin'), ctrl.getCounts);

// Candidate: get own requests
router.get('/me', authorize('candidate'), ctrl.getMine);

// Admin: list all
router.get('/', authorize('admin'), ctrl.list);

// Candidate: submit a request for a volunteer
router.post('/:volunteerId', authorize('candidate'), ctrl.create);

// Admin: review (mark connected or closed)
router.put('/:id/review', authorize('admin'), ctrl.review);

export default router;
