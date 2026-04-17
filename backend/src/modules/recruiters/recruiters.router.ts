// src/modules/recruiters/recruiters.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl        from './recruiters.controller';

const router = Router();

// ── Recruiter self-service ────────────────────────────────────────────────────
// MUST be declared before /:id routes so Express doesn't match 'me' as an id param
router.get(   '/me',                          authenticate, authorize('recruiter'), ctrl.getMyProfile);
router.get(   '/me/shortlist',                authenticate, authorize('recruiter'), ctrl.getShortlist);
router.post(  '/me/shortlist/:candidateId',    authenticate, authorize('recruiter'), ctrl.addShortlist);
router.delete('/me/shortlist/:candidateId',    authenticate, authorize('recruiter'), ctrl.removeShortlist);

// ── Admin-only: manage recruiters ─────────────────────────────────────────────
router.post(  '/',                        authenticate, authorize('admin'), ctrl.create);
router.get(   '/',                        authenticate, authorize('admin'), ctrl.list);
router.get(   '/:id',                     authenticate, authorize('admin'), ctrl.getOne);
router.get(   '/:id/shortlist',           authenticate, authorize('admin'), ctrl.getShortlistById);
router.put(   '/:id',                     authenticate, authorize('admin'), ctrl.update);
router.delete('/:id',                     authenticate, authorize('admin'), ctrl.remove);

// ── Admin-only: resend credentials ────────────────────────────────────────────
router.post(  '/:id/resend-credentials',  authenticate, authorize('admin'), ctrl.resendCreds);

export default router;
