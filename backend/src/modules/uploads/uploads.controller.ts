// src/modules/uploads/uploads.controller.ts
import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { MAX_SIZES, UPLOADS_BASE_PATH } from '../../config/multer';
import { env } from '../../config/env';
import {
  updateCandidateFile,
  addCertificateFile,
  updateCertificateMetadata,
  getCandidateById,
} from '../candidates/candidates.service';
import { logAudit } from '../../services/audit.service';

// ── Constants (resolved from env at startup) ──────────────────────────────────

// Public base URL for uploaded files.
//   Local : http://localhost:3000/uploads
//   VPS   : https://ntlcareernexus.com/uploads
const UPLOADS_BASE_URL = `${env.APP_URL.replace(/\/$/, '')}/uploads`;

// ── Type helpers ──────────────────────────────────────────────────────────────

type FileField = 'profile_photo_url' | 'resume_url' | 'intro_video_url';

const TYPE_TO_FIELD: Record<string, FileField> = {
  profiles: 'profile_photo_url',
  resumes:  'resume_url',
  videos:   'intro_video_url',
};

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// ── URL / path helpers ────────────────────────────────────────────────────────

/**
 * Build the public URL for a newly saved file.
 *   type=profiles, filename=abc.jpg
 *   → http://localhost:3000/uploads/profiles/abc.jpg        (local)
 *   → https://ntlcareernexus.com/uploads/profiles/abc.jpg   (VPS)
 */
function buildFileUrl(type: string, filename: string): string {
  return `${UPLOADS_BASE_URL}/${type}/${filename}`;
}

/**
 * Convert a stored public URL back to an absolute filesystem path so we can
 * delete the file. Returns null for old Cloudinary URLs — those are skipped.
 */
function localPathFromUrl(storedUrl: string): string | null {
  if (!storedUrl.startsWith(UPLOADS_BASE_URL)) return null;
  const relative = storedUrl.slice(UPLOADS_BASE_URL.length); // e.g. /profiles/uuid.jpg
  return path.join(UPLOADS_BASE_PATH, relative);
}

/**
 * Safely delete a file from disk.
 * - No-op for null / undefined / old Cloudinary URLs.
 * - Swallows ENOENT (file already gone is fine).
 * - Re-throws any other fs error.
 */
async function deleteLocalFile(storedUrl: string | null | undefined): Promise<void> {
  if (!storedUrl) return;
  const localPath = localPathFromUrl(storedUrl);
  if (!localPath) {
    return;
  }
  try {
    await fs.unlink(localPath);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return;
    }
    throw err;
  }
}

// ── Candidate ownership helper ────────────────────────────────────────────────

async function getOwnCandidateId(userId: string): Promise<string | null> {
  const row = await db('candidates').where({ user_id: userId }).select('id').first();
  return row?.id ?? null;
}

// ── Upload debug helper ───────────────────────────────────────────────────────

function logUploadedFile(label: string, file: Express.Multer.File | undefined): void {
  if (!file) {
    return;
  }
  // File metadata is available if needed for audit logging
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/candidates/me/stage-file/:type
 *
 * Stage a file for the candidate edit-request workflow.
 * File is written to disk immediately. The returned URL is stored in the
 * edit-request payload and written to the candidate row only on admin approval.
 */
export async function stageCandidateFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const type = p(req.params['type']);
    logUploadedFile('STAGE', req.file);

    const file = req.file;
    if (!file) throw new AppError(400, 'No file provided');

    const maxSize = MAX_SIZES[type];
    if (maxSize && file.size > maxSize) {
      await deleteLocalFile(buildFileUrl(type, file.filename));
      throw new AppError(413, `File too large. Max size for ${type}: ${maxSize / 1024 / 1024} MB`);
    }

    const url = buildFileUrl(type, file.filename);

    res.json({
      message:      'File staged — will be applied on approval',
      relativePath: url,  // kept for frontend API compatibility
      url,
    });
  } catch (err: any) {
    next(err);
  }
}

/**
 * POST /api/v1/candidates/:id/files/:type
 *
 * Upload a file and write its URL directly to the candidate profile.
 * Candidates may only upload to their own profile; admins can upload to any.
 */
export async function uploadCandidateFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id   = p(req.params['id']);
    const type = p(req.params['type']);
    logUploadedFile('UPLOAD', req.file);

    if (req.user?.role === 'candidate') {
      const ownId = await getOwnCandidateId(req.user.sub);
      if (ownId !== id) throw new AppError(403, 'Access denied');
    }

    const file = req.file;
    if (!file) throw new AppError(400, 'No file provided');

    const maxSize = MAX_SIZES[type];
    if (maxSize && file.size > maxSize) {
      await deleteLocalFile(buildFileUrl(type, file.filename));
      throw new AppError(413, `File too large. Max size for ${type}: ${maxSize / 1024 / 1024} MB`);
    }

    await getCandidateById(id); // throws 404 if not found

    const url = buildFileUrl(type, file.filename);

    if (type === 'certificates') {
      const certName    = (req.body['name']       as string) || file.originalname;
      const issuer      = (req.body['issuer']      as string) || undefined;
      const issue_date  = (req.body['issue_date']  as string) || undefined;
      const expiry_date = (req.body['expiry_date'] as string) || null;
      const no_expiry   = req.body['no_expiry'] === 'true' || req.body['no_expiry'] === true;
      await addCertificateFile(id, certName, url, { issuer, issue_date, expiry_date, no_expiry });
    } else {
      const field = TYPE_TO_FIELD[type];
      if (!field) throw new AppError(400, `Unknown file type: ${type}`);
      await updateCandidateFile(id, field, url);
    }

    await logAudit({
      userId:     req.user?.sub,
      action:     'UPLOAD_FILE',
      resource:   'candidate',
      resourceId: id,
      metadata:   { type, filename: file.filename, url },
      ipAddress:  req.ip,
    });

    res.json({
      message:  'File uploaded successfully',
      url,
      filename: file.filename,
    });
  } catch (err: any) {
    next(err);
  }
}

/**
 * DELETE /api/v1/candidates/:id/files/:type
 *
 * Null the DB column then delete the file from disk.
 * Old Cloudinary URLs are skipped silently.
 */
export async function deleteCandidateFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id   = p(req.params['id']);
    const type = p(req.params['type']);

    if (req.user?.role === 'candidate') {
      const ownId = await getOwnCandidateId(req.user.sub);
      if (ownId !== id) throw new AppError(403, 'Access denied');
    }

    const field = TYPE_TO_FIELD[type];
    if (!field) throw new AppError(400, `Unknown file type: ${type}`);

    const candidate = await getCandidateById(id);
    const existing  = (candidate as any)[field] as string | null;

    await db('candidates').where({ id }).update({ [field]: null, updated_at: new Date() });

    await deleteLocalFile(existing);

    await logAudit({
      userId:     req.user?.sub,
      action:     'DELETE_FILE',
      resource:   'candidate',
      resourceId: id,
      metadata:   { type },
      ipAddress:  req.ip,
    });

    res.json({ message: 'File removed' });
  } catch (err: any) {
    next(err);
  }
}

/**
 * DELETE /api/v1/candidates/:id/certificates/:certId
 *
 * Delete the certificate DB row and its file from disk.
 */
export async function deleteCandidateCertificate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id     = p(req.params['id']);
    const certId = p(req.params['certId']);

    if (req.user?.role === 'candidate') {
      const ownId = await getOwnCandidateId(req.user.sub);
      if (ownId !== id) throw new AppError(403, 'Access denied');
    }

    const cert = await db('candidate_certificates')
      .where({ id: certId, candidate_id: id })
      .first();

    if (!cert) throw new AppError(404, 'Certificate not found');

    await db('candidate_certificates').where({ id: certId }).delete();

    await deleteLocalFile(cert.file_url as string | null);

    await logAudit({
      userId:     req.user?.sub,
      action:     'DELETE_FILE',
      resource:   'candidate',
      resourceId: id,
      metadata:   { type: 'certificates', certId },
      ipAddress:  req.ip,
    });

    res.json({ message: 'Certificate removed' });
  } catch (err: any) {
    next(err);
  }
}

/**
 * PATCH /api/v1/candidates/:id/certificates/:certId
 *
 * Admin-only: update certificate metadata. No file operation.
 */
export async function patchCandidateCertificate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id     = p(req.params['id']);
    const certId = Number(p(req.params['certId']));

    if (req.user?.role !== 'admin') throw new AppError(403, 'Access denied');

    const { name, issuer, issue_date, expiry_date, no_expiry } = req.body as {
      name?:        string;
      issuer?:      string;
      issue_date?:  string | null;
      expiry_date?: string | null;
      no_expiry?:   boolean;
    };

    await updateCertificateMetadata(id, certId, { name, issuer, issue_date, expiry_date, no_expiry });

    await logAudit({
      userId:     req.user?.sub,
      action:     'UPDATE_CERT_METADATA',
      resource:   'candidate',
      resourceId: id,
      metadata:   { certId },
      ipAddress:  req.ip,
    });

    res.json({ message: 'Certificate updated' });
  } catch (err: any) {
    next(err);
  }
}
