// src/modules/admin-management/admin-management.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './admin-management.controller';

const router = Router();

// Super-admin ONLY — regular admins must never manage other admin accounts.
router.use(authenticate, authorize('super_admin'));

router.post('/',                    ctrl.create);
router.get('/',                     ctrl.list);
router.get('/:id',                  ctrl.getOne);
router.post('/:id/deactivate',      ctrl.deactivate);
router.post('/:id/reactivate',      ctrl.reactivate);
router.post('/:id/reset-password',  ctrl.resetPassword);

export default router;
