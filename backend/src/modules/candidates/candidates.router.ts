// src/modules/candidates/candidates.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './candidates.controller';

const router = Router();

// All routes require auth
router.use(authenticate);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.post('/',
  authorize('admin', 'super_admin'),
  ctrl.create,
);

router.post('/bulk-action',
  authorize('admin', 'super_admin'),
  ctrl.bulkActionHandler,
);

router.get('/',
  authorize('admin', 'super_admin', 'recruiter'),
  ctrl.list,
);

router.delete('/:id',
  authorize('admin', 'super_admin'),
  ctrl.remove,
);

router.post('/:id/resend-credentials',
  authorize('admin', 'super_admin'),
  ctrl.resendCreds,
);

router.post('/:id/invite-volunteer',
  authorize('admin', 'super_admin'),
  ctrl.inviteVolunteer,
);

router.post('/:id/reactivate-volunteer',
  authorize('admin', 'super_admin'),
  ctrl.reactivateVolunteer,
);

router.put('/:id',
  authorize('admin', 'super_admin'),
  ctrl.update,
);

router.get('/export',
  authorize('admin', 'super_admin'),
  ctrl.exportCsv,
);

// ── Candidate self-view ────────────────────────────────────────────────────────
router.get('/me',
  authorize('candidate'),
  ctrl.getMyProfile,
);

// ── Shared: admin, recruiter, candidate (own) ──────────────────────────────────
router.get('/:id/activity',
  authorize('admin', 'super_admin'),
  ctrl.getActivity,
);

router.get('/:id',
  authorize('admin', 'super_admin', 'recruiter', 'candidate'),
  ctrl.getOne,
);

export default router;
