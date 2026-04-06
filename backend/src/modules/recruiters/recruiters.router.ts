// src/modules/recruiters/recruiters.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl        from './recruiters.controller';

const router = Router();

// ── Admin-only: manage recruiters ─────────────────────────────────────────────
router.post(  '/',                   authenticate, authorize('admin'), ctrl.create);
router.get(   '/',                   authenticate, authorize('admin'), ctrl.list);
router.get(   '/:id',                authenticate, authorize('admin'), ctrl.getOne);
router.delete('/:id',                authenticate, authorize('admin'), ctrl.remove);

// ── Admin-only: token lifecycle ───────────────────────────────────────────────
router.post(  '/:id/generate-token', authenticate, authorize('admin'), ctrl.generateToken);
router.post(  '/:id/revoke-token',   authenticate, authorize('admin'), ctrl.revokeToken);

// ── Recruiter self-service ────────────────────────────────────────────────────
router.get(   '/me',                          authenticate, authorize('recruiter'), ctrl.getMyProfile);
router.get(   '/me/shortlist',                authenticate, authorize('recruiter'), ctrl.getShortlist);
router.post(  '/me/shortlist/:employeeId',    authenticate, authorize('recruiter'), ctrl.addShortlist);
router.delete('/me/shortlist/:employeeId',    authenticate, authorize('recruiter'), ctrl.removeShortlist);

export default router;
