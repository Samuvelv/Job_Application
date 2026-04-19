// src/modules/volunteers/volunteers.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import * as svc from './volunteers.service';
import { CreateVolunteerSchema, UpdateVolunteerSchema } from './volunteers.dto';

const router = Router();
router.use(authenticate);

// List — admin and candidate
router.get('/',
  authorize('admin', 'candidate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page   = Math.max(1, Number(req.query['page'])  || 1);
      const limit  = Math.max(1, Number(req.query['limit']) || 20);
      const search = (req.query['search'] as string) || undefined;
      const result = await svc.listVolunteers({ search, page, limit });
      res.json(result);
    } catch (err) { next(err); }
  },
);

// Create — admin only
router.post('/',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto       = CreateVolunteerSchema.parse(req.body);
      const volunteer = await svc.createVolunteer(dto, req.user!.sub);
      res.status(201).json({ volunteer });
    } catch (err) { next(err); }
  },
);

// Update — admin only
router.put('/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto       = UpdateVolunteerSchema.parse(req.body);
      const volunteer = await svc.updateVolunteer(req.params['id'] as string, dto);
      res.json({ volunteer });
    } catch (err) { next(err); }
  },
);

// Delete — admin only
router.delete('/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.deleteVolunteer(req.params['id'] as string);
      res.json({ message: 'Volunteer deleted' });
    } catch (err) { next(err); }
  },
);

export default router;
