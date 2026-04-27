import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as ctrl from './contact-submissions.controller';

const router = Router();

// Public — landing page contact form
router.post('/', ctrl.submit);

// Admin only
router.use(authenticate);
router.get('/',           authorize('admin'), ctrl.list);
router.put('/:id/read',   authorize('admin'), ctrl.markRead);

export default router;
