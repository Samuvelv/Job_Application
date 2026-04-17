// src/modules/uploads/uploads.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../../config/cloudinary';
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
  profiles: 'profile_photo_url',
  resumes:  'resume_url',
  videos:   'intro_video_url',
};

// Cloudinary folder per file type
const TYPE_TO_FOLDER: Record<string, string> = {
  profiles:     'talenthub/profiles',
  resumes:      'talenthub/resumes',
  videos:       'talenthub/videos',
  certificates: 'talenthub/certificates',
};

// Resource type for Cloudinary (images vs raw vs video)
const TYPE_TO_RESOURCE: Record<string, 'image' | 'raw' | 'video'> = {
  profiles:     'image',
  resumes:      'raw',
  certificates: 'raw',
  videos:       'video',
};

/** Upload a buffer to Cloudinary and return the upload result */
function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'video',
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, use_filename: false, unique_filename: true },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

/** Extract Cloudinary public_id from a secure_url so we can destroy it */
function publicIdFromUrl(secureUrl: string): string {
  // URL pattern: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<id>.<ext>
  // We need everything after /upload/v<version>/ and without the extension
  const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return '';
  return match[1].replace(/\.[^/.]+$/, ''); // strip file extension
}

/** Resolve the employee row that belongs to the calling user */
async function getOwnEmployeeId(userId: string): Promise<string | null> {
  const row = await db('employees').where({ user_id: userId }).select('id').first();
  return row?.id ?? null;
}

// ── Stage file (employee edit-request flow) ───────────────────────────────────

/** POST /api/v1/employees/me/stage-file/:type
 * Upload to Cloudinary, return the secure_url.
 * Does NOT write to the employee row — included in the edit-request payload.
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
      throw new AppError(413, `File too large. Max size for ${type}: ${maxSize / 1024 / 1024} MB`);
    }

    const folder       = TYPE_TO_FOLDER[type]    ?? 'talenthub/misc';
    const resourceType = TYPE_TO_RESOURCE[type]  ?? 'raw';

    const result = await uploadToCloudinary(file.buffer, folder, resourceType);

    res.json({
      message:      'File staged — will be applied on approval',
      relativePath: result.secure_url, // kept for API compatibility; value is now a full URL
      url:          result.secure_url,
    });
  } catch (err) {
    next(err);
  }
}

// ── Upload directly to employee profile ───────────────────────────────────────

/** POST /api/v1/employees/:id/files/:type */
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
      throw new AppError(413, `File too large. Max size for ${type}: ${maxSize / 1024 / 1024} MB`);
    }

    await getEmployeeById(id);

    const folder       = TYPE_TO_FOLDER[type]   ?? 'talenthub/misc';
    const resourceType = TYPE_TO_RESOURCE[type] ?? 'raw';

    const result = await uploadToCloudinary(file.buffer, folder, resourceType);
    const secureUrl = result.secure_url;

    if (type === 'certificates') {
      const certName = (req.body['name'] as string) || file.originalname;
      await addCertificateFile(id, certName, secureUrl);
    } else {
      const field = TYPE_TO_FIELD[type];
      if (!field) throw new AppError(400, `Unknown file type: ${type}`);
      await updateEmployeeFile(id, field, secureUrl);
    }

    await logAudit({
      userId: req.user?.sub, action: 'UPLOAD_FILE',
      resource: 'employee', resourceId: id,
      metadata: { type, cloudinaryPublicId: result.public_id },
      ipAddress: req.ip,
    });

    res.json({
      message:  'File uploaded successfully',
      url:      secureUrl,
      filename: result.public_id,
    });
  } catch (err) {
    next(err);
  }
}

// ── Delete profile / resume / video ──────────────────────────────────────────

/** DELETE /api/v1/employees/:id/files/:type */
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

    // Clear DB reference first
    await db('employees').where({ id }).update({ [field]: null, updated_at: new Date() });

    // Destroy from Cloudinary
    if (existing) {
      const publicId    = publicIdFromUrl(existing);
      const resourceType = TYPE_TO_RESOURCE[type] ?? 'raw';
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      }
    }

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

// ── Delete certificate ────────────────────────────────────────────────────────

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

    // Destroy from Cloudinary
    if (cert.file_url) {
      const publicId = publicIdFromUrl(cert.file_url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      }
    }

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
