// src/modules/audit-logs/audit-logs.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { list, actions, exportCsv } from './audit-logs.controller';

const router = Router();

// Admin-only
router.use(authenticate, authorize('admin'));

router.get('/export',  exportCsv);
router.get('/actions', actions);
router.get('/',        list);

export default router;
