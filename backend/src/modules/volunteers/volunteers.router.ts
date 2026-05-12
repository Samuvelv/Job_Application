// src/modules/volunteers/volunteers.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '../../middleware/authenticate';
import { authorize }    from '../../middleware/authorize';
import { upload, UPLOADS_BASE_PATH } from '../../config/multer';
import { env } from '../../config/env';
import { logAudit } from '../../services/audit.service';
import * as svc from './volunteers.service';
import { CreateVolunteerSchema, UpdateVolunteerSchema } from './volunteers.dto';

const router = Router();
router.use(authenticate);

// ── Constants (resolved from env) ────────────────────────────────────────────

const UPLOADS_BASE_URL = `${env.APP_URL.replace(/\/$/, '')}/uploads`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a stored local URL back to an absolute filesystem path.
 * Returns null for old Cloudinary URLs — skip deletion silently.
 */
function localPathFromUrl(storedUrl: string): string | null {
  if (!storedUrl.startsWith(UPLOADS_BASE_URL)) return null;
  const relative = storedUrl.slice(UPLOADS_BASE_URL.length);
  return path.join(UPLOADS_BASE_PATH, relative);
}
/**
 * Safely delete a local file. No-op for Cloudinary URLs or missing files.
 */
async function deleteLocalFile(storedUrl: string | null | undefined): Promise<void> {
  if (!storedUrl) return;
  const localPath = localPathFromUrl(storedUrl);
  if (!localPath) {
    console.log(`[VOLUNTEER_DELETE] Skipping non-local URL: ${storedUrl}`);
    return;
  }
  try {
    await fs.unlink(localPath);
    console.log(`[VOLUNTEER_DELETE] Removed: ${localPath}`);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.warn(`[VOLUNTEER_DELETE] File not found (already gone): ${localPath}`);
      return;
    }
    console.error(`[VOLUNTEER_DELETE] Failed to delete: ${localPath}`, err.message);
    throw err;
  }
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
      const sector         = (req.query['sector']         as string) || undefined;
      const nationality    = (req.query['nationality']    as string) || undefined;
      const sort           = (req.query['sort']           as string) || undefined;
      const result = await svc.listVolunteers({ search, country_placed, availability, language, sector, nationality, sort, page, limit });
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
      const sector         = (req.query['sector']         as string) || undefined;
      const nationality    = (req.query['nationality']    as string) || undefined;
      const sort           = (req.query['sort']           as string) || undefined;
      const csv = await svc.exportVolunteers({ search, country_placed, availability, language, sector, nationality, sort });
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
      logAudit({
        userId:     req.user!.sub,
        action:     'ADD_VOLUNTEER',
        resource:   'volunteer',
        resourceId: volunteer.id,
        ipAddress:  req.ip,
        metadata:   { name: volunteer.name, availability: volunteer.availability },
      }).catch(() => {});
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

/**
 * POST /api/v1/volunteers/:id/photo
 * Upload a photo for an existing volunteer. Admin only.
 * Multipart field name: "file"
 *
 * We inject req.params.type = 'profiles' before multer runs so that
 * diskStorage.destination() places the file in the correct sub-folder:
 *   /var/www/ntlcareernexus/uploads/profiles/<uuid>.jpg
 */
router.post('/:id/photo',
  authorize('admin'),

  // Inject synthetic :type so multer diskStorage uses the right sub-folder
  (req: Request, _res: Response, next: NextFunction) => {
    req.params['type'] = 'profiles';
    next();
  },

  upload.single('file'),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id   = req.params['id'] as string;
      const file = req.file;

      console.log(`[VOLUNTEER_PHOTO] POST /volunteers/${id}/photo`);

      if (!file) {
        console.warn('[VOLUNTEER_PHOTO] req.file is undefined');
        res.status(400).json({ message: 'No file provided' });
        return;
      }

      console.log(`[VOLUNTEER_PHOTO] req.file = {`);
      console.log(`[VOLUNTEER_PHOTO]   originalname : "${file.originalname}"`);
      console.log(`[VOLUNTEER_PHOTO]   mimetype     : "${file.mimetype}"`);
      console.log(`[VOLUNTEER_PHOTO]   size         : ${file.size} bytes`);
      console.log(`[VOLUNTEER_PHOTO]   destination  : "${(file as any).destination}"`);
      console.log(`[VOLUNTEER_PHOTO]   filename     : "${file.filename}"`);
      console.log(`[VOLUNTEER_PHOTO]   path         : "${(file as any).path}"`);
      console.log(`[VOLUNTEER_PHOTO] }`);

      const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_PHOTO_SIZE) {
        console.warn(`[VOLUNTEER_PHOTO] File too large: ${file.size} > ${MAX_PHOTO_SIZE}`);
        // Remove the already-written file before returning error
        await deleteLocalFile(`${UPLOADS_BASE_URL}/profiles/${file.filename}`);
        res.status(413).json({ message: 'Image too large. Maximum size is 5 MB.' });
        return;
      }

      const url       = `${UPLOADS_BASE_URL}/profiles/${file.filename}`;
      console.log(`[VOLUNTEER_PHOTO] ✓ File saved. Public URL: ${url}`);
      console.log(`[VOLUNTEER_PHOTO]   Disk path: ${(file as any).path}`);

      const volunteer = await svc.updateVolunteerPhoto(id, url);
      res.json({ volunteer, url });
    } catch (err: any) {
      console.error('[VOLUNTEER_PHOTO] Error:', err.message ?? err);
      next(err);
    }
  },
);

// Update — admin only
router.put('/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id        = req.params['id'] as string;
      const dto       = UpdateVolunteerSchema.parse(req.body);
      const volunteer = await svc.updateVolunteer(id, dto);

      logAudit({
        userId:     req.user!.sub,
        action:     'UPDATE_VOLUNTEER',
        resource:   'volunteer',
        resourceId: id,
        ipAddress:  req.ip,
        metadata:   { updatedFields: Object.keys(dto) },
      }).catch(() => {});

      if (dto.availability && dto.availability !== 'Active') {
        logAudit({
          userId:     req.user!.sub,
          action:     'DEACTIVATE_VOLUNTEER',
          resource:   'volunteer',
          resourceId: id,
          ipAddress:  req.ip,
          metadata:   { availability: dto.availability },
        }).catch(() => {});
      }

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
