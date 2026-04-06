// src/config/multer.ts
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_TYPES: Record<string, string[]> = {
  profiles:     ['image/jpeg', 'image/png', 'image/webp'],
  resumes:      ['application/pdf', 'application/msword',
                 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  certificates: ['application/pdf', 'image/jpeg', 'image/png'],
  videos:       ['video/mp4', 'video/webm', 'video/quicktime'],
};

const MAX_SIZES: Record<string, number> = {
  profiles:     5  * 1024 * 1024,   // 5 MB
  resumes:      10 * 1024 * 1024,   // 10 MB
  certificates: 10 * 1024 * 1024,   // 10 MB
  videos:       50 * 1024 * 1024,   // 50 MB
};

const storage = multer.diskStorage({
  destination(req: Request, _file, cb) {
    const folder = (req.params.type as string) || 'profiles';
    const dest = path.join(__dirname, '../../uploads', folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const folder = (req.params.type as string) || 'profiles';
  const allowed = ALLOWED_TYPES[folder] ?? [];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed for ${folder}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // global max 50MB; per-type checked in controller
});

export { MAX_SIZES, ALLOWED_TYPES };
