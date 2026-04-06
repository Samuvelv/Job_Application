// src/modules/stats/stats.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './stats.controller';

const router = Router();

router.use(authenticate);

router.get('/admin',    authorize('admin'),    ctrl.adminStats);
router.get('/employee', authorize('employee'), ctrl.employeeStats);
router.get('/recruiter',authorize('recruiter'),ctrl.recruiterStats);

export default router;
