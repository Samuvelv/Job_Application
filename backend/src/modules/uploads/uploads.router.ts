// src/modules/uploads/uploads.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { upload } from '../../config/multer';
import { uploadEmployeeFile, serveFile } from './uploads.controller';

const router = Router();

/**
 * POST /api/v1/employees/:id/files/:type
 * type: profiles | resumes | videos | certificates
 */
router.post(
  '/employees/:id/files/:type',
  authenticate,
  authorize('admin'),
  upload.single('file'),
  uploadEmployeeFile,
);

/**
 * GET /api/v1/files/:type/:filename
 * Authenticated file serving — all roles
 */
router.get(
  '/files/:type/:filename',
  authenticate,
  serveFile,
);

export default router;
