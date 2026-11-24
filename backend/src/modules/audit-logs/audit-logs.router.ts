// src/modules/audit-logs/audit-logs.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { list, actions, exportCsv, adminUsers } from './audit-logs.controller';

const router = Router();

// Admin + Super Admin
router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/export',       exportCsv);
router.get('/actions',      actions);
// Super-admin only — backs the "filter by admin" picker, used to track admin activity.
router.get('/admin-users',  authorize('super_admin'), adminUsers);
router.get('/',             list);

export default router;
