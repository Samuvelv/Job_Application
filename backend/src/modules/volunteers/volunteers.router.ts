// src/modules/volunteers/volunteers.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import { upload }       from '../../config/multer';
import { cloudinary }   from '../../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import * as svc from './volunteers.service';
import { CreateVolunteerSchema, UpdateVolunteerSchema } from './volunteers.dto';
const router = Router();
router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────────────

function uploadToCloudinary(buffer: Buffer): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'talenthub/volunteers', resource_type: 'image', use_filename: false, unique_filename: true },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

// List — admin and candidate
router.get('/',
  authorize('admin', 'candidate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page           = Math.max(1, Number(req.query['page'])  || 1);
      const limit          = Math.max(1, Number(req.query['limit']) || 20);
      const search         = (req.query['search']         as string) || undefined;
      const country_placed = (req.query['country_placed'] as string) || undefined;
      const availability   = (req.query['availability']   as string) || undefined;
      const language       = (req.query['language']       as string) || undefined;
      const sort           = (req.query['sort']           as string) || undefined;
      const result = await svc.listVolunteers({ search, country_placed, availability, language, sort, page, limit });
      res.json(result);
    } catch (err) { next(err); }
  },
);

// Export CSV — admin only
router.get('/export',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const search         = (req.query['search']         as string) || undefined;
      const country_placed = (req.query['country_placed'] as string) || undefined;
      const availability   = (req.query['availability']   as string) || undefined;
      const language       = (req.query['language']       as string) || undefined;
      const sort           = (req.query['sort']           as string) || undefined;
      const csv = await svc.exportVolunteers({ search, country_placed, availability, language, sort });
      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="volunteers-${date}.csv"`);
      res.send(csv);
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

// Get single volunteer — admin and candidate
router.get('/:id',
  authorize('admin', 'candidate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const volunteer = await svc.getVolunteerById(req.params['id'] as string);
      res.json({ volunteer });
    } catch (err) { next(err); }
  },
);

// Upload photo for an existing volunteer — admin only
// POST /api/v1/volunteers/:id/photo  (multipart field: "file")
router.post('/:id/photo',
  authorize('admin'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id   = req.params['id'] as string;
      const file = req.file;
      if (!file) { res.status(400).json({ message: 'No file provided' }); return; }

      const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_PHOTO_SIZE) {
        res.status(413).json({ message: 'Image too large. Maximum size is 5 MB.' });
        return;
      }

      const result    = await uploadToCloudinary(file.buffer);
      const volunteer = await svc.updateVolunteerPhoto(id, result.secure_url);
      res.json({ volunteer, url: result.secure_url });
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
