// src/modules/audit-logs/audit-logs.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { list, actions } from './audit-logs.controller';

const router = Router();

// Admin-only
router.use(authenticate, authorize('admin'));

router.get('/',        list);
router.get('/actions', actions);

export default router;
