// src/modules/uploads/uploads.controller.ts
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { MAX_SIZES } from '../../config/multer';
import {
  updateEmployeeFile,
  addCertificateFile,
  getEmployeeById,
} from '../employees/employees.service';
import { logAudit } from '../../services/audit.service';

const UPLOADS_ROOT = path.join(__dirname, '../../../uploads');

type FileField = 'profile_photo_url' | 'resume_url' | 'intro_video_url';
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

const TYPE_TO_FIELD: Record<string, FileField> = {
  profiles:  'profile_photo_url',
  resumes:   'resume_url',
  videos:    'intro_video_url',
};

function deleteFileFromDisk(relativePath: string): void {
  // relativePath is like /uploads/profiles/filename.jpg
  const safePath = path.join(UPLOADS_ROOT, path.basename(path.dirname(relativePath)), path.basename(relativePath));
  if (fs.existsSync(safePath)) {
    try { fs.unlinkSync(safePath); } catch { /* ignore */ }
  }
}

/** POST /api/v1/employees/me/stage-file/:type
 * Employee-only: upload a file to disk and return its relative URL.
 * The URL is NOT written to the employee row — it is included in the
 * edit-request JSON and only applied to the profile on admin approval.
 */
export async function stageEmployeeFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const type = p(req.params['type']);
    const file = req.file;

    if (!file) throw new AppError(400, 'No file provided');

    const maxSize = MAX_SIZES[type];
    if (maxSize && file.size > maxSize) {
      fs.unlinkSync(file.path);
      throw new AppError(413, `File too large. Max size for ${type}: ${maxSize / 1024 / 1024}MB`);
    }

    const relativePath = `/uploads/${type}/${file.filename}`;

    res.json({
      message:      'File staged — will be applied on approval',
      relativePath,
      url: `${process.env['APP_URL']}/api/v1/files/${type}/${file.filename}`,
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => undefined);
    next(err);
  }
}

/** Resolve the employee row that belongs to the calling user (for self-service checks) */
async function getOwnEmployeeId(userId: string): Promise<string | null> {
  const row = await db('employees').where({ user_id: userId }).select('id').first();
  return row?.id ?? null;
}

/** POST /api/v1/employees/:id/files/:type  */
export async function uploadEmployeeFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id   = p(req.params['id']);
    const type = p(req.params['type']);

    // Employees may only upload to their own profile
    if (req.user?.role === 'employee') {
      const ownId = await getOwnEmployeeId(req.user.sub);
      if (ownId !== id) throw new AppError(403, 'Access denied');
    }
    const file = req.file;

    if (!file) throw new AppError(400, 'No file provided');

    const maxSize = MAX_SIZES[type];
    if (maxSize && file.size > maxSize) {
      fs.unlinkSync(file.path);
      throw new AppError(413, `File too large. Max size for ${type}: ${maxSize / 1024 / 1024}MB`);
    }

    await getEmployeeById(id);

    const relativePath = `/uploads/${type}/${file.filename}`;

    if (type === 'certificates') {
      const certName = (req.body['name'] as string) || file.originalname;
      await addCertificateFile(id, certName, relativePath);
    } else {
      const field = TYPE_TO_FIELD[type];
      if (!field) throw new AppError(400, `Unknown file type: ${type}`);
      await updateEmployeeFile(id, field, relativePath);
    }

    await logAudit({
      userId: req.user?.sub, action: 'UPLOAD_FILE',
      resource: 'employee', resourceId: id,
      metadata: { type, filename: file.filename },
      ipAddress: req.ip,
    });

    res.json({
      message: 'File uploaded successfully',
      url: `${process.env['APP_URL']}/api/v1/files/${type}/${file.filename}`,
      filename: file.filename,
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => undefined);
    next(err);
  }
}

/** GET /api/v1/files/:type/:filename  — authenticated file serving */
export async function serveFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const type     = p(req.params['type']);
    const filename = p(req.params['filename']);
    const safeName = path.basename(filename);
    const filePath = path.join(__dirname, '../../../uploads', type, safeName);

    if (!fs.existsSync(filePath)) throw new AppError(404, 'File not found');

    if (req.user?.role === 'employee') {
      const employee = await db('employees as e')
        .join('users as u', 'u.id', 'e.user_id')
        .where('u.id', req.user.sub)
        .first();

      if (!employee) throw new AppError(403, 'Access denied');

      const ownsFile =
        employee.profile_photo_url?.includes(safeName) ||
        employee.resume_url?.includes(safeName)        ||
        employee.intro_video_url?.includes(safeName);

      if (!ownsFile) {
        const cert = await db('employee_certificates')
          .where({ employee_id: employee.id })
          .whereILike('file_url', `%${safeName}%`)
          .first();
        if (!cert) throw new AppError(403, 'Access denied');
      }
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/employees/:id/files/:type  — remove profile/resume/video */
export async function deleteEmployeeFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id   = p(req.params['id']);
    const type = p(req.params['type']);

    if (req.user?.role === 'employee') {
      const ownId = await getOwnEmployeeId(req.user.sub);
      if (ownId !== id) throw new AppError(403, 'Access denied');
    }

    const field = TYPE_TO_FIELD[type];
    if (!field) throw new AppError(400, `Unknown file type: ${type}`);

    const employee = await getEmployeeById(id);
    const existing = (employee as any)[field] as string | null;

    // Clear DB reference
    await db('employees').where({ id }).update({ [field]: null, updated_at: new Date() });

    // Remove from disk
    if (existing) deleteFileFromDisk(existing);

    await logAudit({
      userId: req.user?.sub, action: 'DELETE_FILE',
      resource: 'employee', resourceId: id,
      metadata: { type },
      ipAddress: req.ip,
    });

    res.json({ message: 'File removed' });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/employees/:id/certificates/:certId */
export async function deleteEmployeeCertificate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id     = p(req.params['id']);
    const certId = p(req.params['certId']);

    if (req.user?.role === 'employee') {
      const ownId = await getOwnEmployeeId(req.user.sub);
      if (ownId !== id) throw new AppError(403, 'Access denied');
    }

    const cert = await db('employee_certificates')
      .where({ id: certId, employee_id: id })
      .first();

    if (!cert) throw new AppError(404, 'Certificate not found');

    await db('employee_certificates').where({ id: certId }).delete();

    if (cert.file_url) deleteFileFromDisk(cert.file_url);

    await logAudit({
      userId: req.user?.sub, action: 'DELETE_FILE',
      resource: 'employee', resourceId: id,
      metadata: { type: 'certificates', certId },
      ipAddress: req.ip,
    });

    res.json({ message: 'Certificate removed' });
  } catch (err) {
    next(err);
  }
}
