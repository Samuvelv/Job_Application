// src/modules/agency-referrals/agency-referrals.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as ctrl from './agency-referrals.controller';

const router = Router({ mergeParams: true });
router.use(authenticate);
router.use(authorize('admin'));

// GET    /api/v1/candidates/:candidateId/referrals
router.get('/',    ctrl.list);

// POST   /api/v1/candidates/:candidateId/referrals
router.post('/',   ctrl.create);

// PUT    /api/v1/candidates/:candidateId/referrals/:referralId
router.put('/:referralId',    ctrl.update);

// DELETE /api/v1/candidates/:candidateId/referrals/:referralId
router.delete('/:referralId', ctrl.remove);

export default router;
