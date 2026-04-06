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

type FileField = 'profile_photo_url' | 'resume_url' | 'intro_video_url';
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

const TYPE_TO_FIELD: Record<string, FileField> = {
  profiles:  'profile_photo_url',
  resumes:   'resume_url',
  videos:    'intro_video_url',
};

/** POST /api/v1/employees/:id/files/:type  */
export async function uploadEmployeeFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id   = p(req.params['id']);
    const type = p(req.params['type']);
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
      url: `${process.env['APP_URL']}${relativePath}`,
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
