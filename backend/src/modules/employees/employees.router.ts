// src/modules/employees/employees.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './employees.controller';

const router = Router();

// All routes require auth
router.use(authenticate);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.post('/',
  authorize('admin'),
  ctrl.create,
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

router.put('/:id',
  authorize('admin'),
  ctrl.update,
);

// ── Employee self-view ────────────────────────────────────────────────────────
router.get('/me',
  authorize('employee'),
  ctrl.getMyProfile,
);

// ── Shared: admin, recruiter, employee (own) ──────────────────────────────────
router.get('/:id',
  authorize('admin', 'recruiter', 'employee'),
  ctrl.getOne,
);

export default router;
