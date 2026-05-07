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
  authorize('admin'),
  ctrl.create,
);

router.post('/bulk-action',
  authorize('admin'),
  ctrl.bulkActionHandler,
);

router.get('/',
  authorize('admin', 'recruiter'),
  ctrl.list,
);

router.delete('/:id',
  authorize('admin'),
  ctrl.remove,
);

router.post('/:id/resend-credentials',
  authorize('admin'),
  ctrl.resendCreds,
);

router.post('/:id/invite-volunteer',
  authorize('admin'),
  ctrl.inviteVolunteer,
);

router.put('/:id',
  authorize('admin'),
  ctrl.update,
);

router.get('/export',
  authorize('admin'),
  ctrl.exportCsv,
);

// ── Candidate self-view ────────────────────────────────────────────────────────
router.get('/me',
  authorize('candidate'),
  ctrl.getMyProfile,
);

// ── Shared: admin, recruiter, candidate (own) ──────────────────────────────────
router.get('/:id',
  authorize('admin', 'recruiter', 'candidate'),
  ctrl.getOne,
);

export default router;
