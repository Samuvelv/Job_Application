// src/modules/uploads/uploads.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { upload } from '../../config/multer';
import {
  uploadEmployeeFile,
  stageEmployeeFile,
  serveFile,
  deleteEmployeeFile,
  deleteEmployeeCertificate,
} from './uploads.controller';

const router = Router();

/**
 * POST /api/v1/employees/me/stage-file/:type
 * Employee-only staging: store file on disk, return relative URL.
 * Does NOT update the employee row — URL goes into edit-request payload.
 * type: profiles | resumes | videos
 */
router.post(
  '/employees/me/stage-file/:type',
  authenticate,
  authorize('employee'),
  upload.single('file'),
  stageEmployeeFile,
);

/**
 * POST /api/v1/employees/:id/files/:type
 * type: profiles | resumes | videos | certificates
 * Admin: any employee.  Employee: own profile only (ownership enforced in controller).
 */
router.post(
  '/employees/:id/files/:type',
  authenticate,
  authorize('admin', 'employee'),
  upload.single('file'),
  uploadEmployeeFile,
);

/**
 * DELETE /api/v1/employees/:id/files/:type
 * type: profiles | resumes | videos
 */
router.delete(
  '/employees/:id/files/:type',
  authenticate,
  authorize('admin', 'employee'),
  deleteEmployeeFile,
);

/**
 * DELETE /api/v1/employees/:id/certificates/:certId
 */
router.delete(
  '/employees/:id/certificates/:certId',
  authenticate,
  authorize('admin', 'employee'),
  deleteEmployeeCertificate,
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
