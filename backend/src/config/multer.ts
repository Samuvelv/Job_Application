// src/config/multer.ts
import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env } from './env';

// ── Resolve upload base path ──────────────────────────────────────────────────
// UPLOADS_PATH from env:
//   Local dev : "uploads"  → resolved to <projectRoot>/uploads  (relative)
//   VPS prod  : "/var/www/ntlcareernexus/uploads"               (absolute)
//
// path.isAbsolute() lets us handle both cases cleanly.
export const UPLOADS_BASE_PATH: string = path.isAbsolute(env.UPLOADS_PATH)
  ? env.UPLOADS_PATH
  : path.resolve(process.cwd(), env.UPLOADS_PATH);

// ── Sub-folders, one per upload type ─────────────────────────────────────────
const UPLOAD_SUBDIRS = ['profiles', 'resumes', 'certificates', 'videos'] as const;
export type UploadType = typeof UPLOAD_SUBDIRS[number];

// ── Allowed MIME types per upload type ───────────────────────────────────────
export const ALLOWED_TYPES: Record<string, string[]> = {
  profiles:     ['image/jpeg', 'image/png', 'image/webp'],
  resumes:      [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  certificates: ['application/pdf', 'image/jpeg', 'image/png'],
  videos:       ['video/mp4', 'video/webm', 'video/quicktime'],
};

// ── Per-type file-size limits ─────────────────────────────────────────────────
export const MAX_SIZES: Record<string, number> = {
  profiles:     5  * 1024 * 1024,  //  5 MB
  resumes:      10 * 1024 * 1024,  // 10 MB
  certificates: 10 * 1024 * 1024,  // 10 MB
  videos:       200 * 1024 * 1024,  // 200 MB
};

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP: guarantee every sub-folder exists before the first request arrives.
// Runs once when the module is imported (i.e. at server boot).
// ─────────────────────────────────────────────────────────────────────────────
(function ensureUploadDirsExist() {
  console.log('[MULTER] Upload base path:', UPLOADS_BASE_PATH);
  for (const sub of UPLOAD_SUBDIRS) {
    const dir = path.join(UPLOADS_BASE_PATH, sub);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      console.log(`[MULTER] ✓ Ready: ${dir}`);
    } catch (err: any) {
      console.error(`[MULTER] ✗ FAILED for ${dir}: ${err.message}`);
    }
  }
})();

// ── Disk storage engine ───────────────────────────────────────────────────────
const storage: StorageEngine = multer.diskStorage({

  destination(req: Request, file: Express.Multer.File, cb) {
    const type = (req.params['type'] as string) || 'misc';
    const dest = path.join(UPLOADS_BASE_PATH, type);

    console.log(`[MULTER] destination() → type="${type}" dest="${dest}" mime="${file.mimetype}"`);

    try {
      fs.mkdirSync(dest, { recursive: true });
    } catch (err: any) {
      console.error(`[MULTER] mkdirSync failed for "${dest}": ${err.message}`);
      cb(err, dest);
      return;
    }

    try {
      fs.accessSync(dest, fs.constants.W_OK);
    } catch (err: any) {
      const msg = `Upload directory not writable: "${dest}" — ${err.message}`;
      console.error(`[MULTER] ✗ ${msg}`);
      cb(new Error(msg), dest);
      return;
    }

    console.log(`[MULTER] ✓ Destination writable: "${dest}"`);
    cb(null, dest);
  },

  filename(_req: Request, file: Express.Multer.File, cb) {
    const ext  = path.extname(file.originalname).toLowerCase() || '';
    const name = `${uuidv4()}${ext}`;
    console.log(`[MULTER] filename() → "${file.originalname}" → "${name}"`);
    cb(null, name);
  },
});

// ── MIME-type filter ──────────────────────────────────────────────────────────
const fileFilter = (
  req:  Request,
  file: Express.Multer.File,
  cb:   FileFilterCallback,
) => {
  const type    = (req.params['type'] as string) || 'profiles';
  const allowed = ALLOWED_TYPES[type] ?? [];

  console.log(`[MULTER] fileFilter() type="${type}" mime="${file.mimetype}"`);

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const msg = `File type "${file.mimetype}" not allowed for "${type}". Allowed: ${allowed.join(', ')}`;
    console.warn(`[MULTER] ✗ Rejected: ${msg}`);
    cb(new Error(msg));
  }
};

// ── Multer instance ───────────────────────────────────────────────────────────
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // hard global cap 200 MB; per-type enforced in controller
    files:    1,
  },
});
