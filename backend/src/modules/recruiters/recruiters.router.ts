// src/modules/recruiters/recruiters.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl        from './recruiters.controller';

const router = Router();

// ── Recruiter self-service ────────────────────────────────────────────────────
// Declared before /:id so Express never matches 'me' as an id param
router.get(   '/me',                        authenticate, authorize('recruiter'), ctrl.getMyProfile);
router.get(   '/me/shortlist',              authenticate, authorize('recruiter'), ctrl.getShortlist);
router.post(  '/me/shortlist/:candidateId', authenticate, authorize('recruiter'), ctrl.addShortlist);
router.delete('/me/shortlist/:candidateId', authenticate, authorize('recruiter'), ctrl.removeShortlist);

// ── Admin-only: fixed-path routes (must come before /:id) ────────────────────
router.post(  '/',                authenticate, authorize('admin'), ctrl.create);
router.get(   '/',                authenticate, authorize('admin'), ctrl.list);
router.get(   '/export',          authenticate, authorize('admin'), ctrl.exportCsv);
router.post(  '/bulk-status',     authenticate, authorize('admin'), ctrl.bulkStatus);
router.post(  '/export-selected', authenticate, authorize('admin'), ctrl.exportSelected);

// ── Admin-only: dynamic /:id routes ──────────────────────────────────────────
// Sub-paths before bare /:id so Express never matches e.g. 'shortlist' as an id
router.get(   '/:id/shortlist',           authenticate, authorize('admin'), ctrl.getShortlistById);
router.post(  '/:id/resend-credentials',  authenticate, authorize('admin'), ctrl.resendCreds);
router.get(   '/:id',                     authenticate, authorize('admin'), ctrl.getOne);
router.put(   '/:id',                     authenticate, authorize('admin'), ctrl.update);
router.delete('/:id',                     authenticate, authorize('admin'), ctrl.remove);

export default router;
