// src/config/multer.ts
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

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

// Use memory storage — files are buffered in RAM and streamed to Cloudinary
const storage = multer.memoryStorage();

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
  limits: { fileSize: 50 * 1024 * 1024 }, // global max 50 MB; per-type enforced in controller
});

export { MAX_SIZES, ALLOWED_TYPES };
