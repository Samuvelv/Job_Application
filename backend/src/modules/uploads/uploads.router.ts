// src/modules/uploads/uploads.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { upload } from '../../config/multer';
import {
  uploadCandidateFile,
  stageCandidateFile,
  deleteCandidateFile,
  deleteCandidateCertificate,
} from './uploads.controller';

const router = Router();

/**
 * POST /api/v1/candidates/me/stage-file/:type
 * Candidate-only staging: upload to Cloudinary, return secure_url.
 * Does NOT update the candidate row — URL goes into edit-request payload.
 * type: profiles | resumes | videos
 */
router.post(
  '/candidates/me/stage-file/:type',
  authenticate,
  authorize('candidate'),
  upload.single('file'),
  stageCandidateFile,
);

/**
 * POST /api/v1/candidates/:id/files/:type
 * type: profiles | resumes | videos | certificates
 * Admin: any candidate.  Candidate: own profile only (ownership enforced in controller).
 */
router.post(
  '/candidates/:id/files/:type',
  authenticate,
  authorize('admin', 'candidate'),
  upload.single('file'),
  uploadCandidateFile,
);

/**
 * DELETE /api/v1/candidates/:id/files/:type
 * type: profiles | resumes | videos
 */
router.delete(
  '/candidates/:id/files/:type',
  authenticate,
  authorize('admin', 'candidate'),
  deleteCandidateFile,
);

/**
 * DELETE /api/v1/candidates/:id/certificates/:certId
 */
router.delete(
  '/candidates/:id/certificates/:certId',
  authenticate,
  authorize('admin', 'candidate'),
  deleteCandidateCertificate,
);

export default router;
