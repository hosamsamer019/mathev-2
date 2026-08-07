import express, { Request, Response } from 'express';
import multer from 'multer';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadFile, getActiveBackend } from '../services/storage.adapter.js';

const router = express.Router();

import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Use disk storage to prevent OOM errors on large files
const diskUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
      'video/mp4', 'video/webm'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPG, PNG, WEBP, PDF, MP4, WEBM allowed.'));
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const handleUpload = (fieldName: string) => [
  verifyToken,
  diskUpload.single(fieldName),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or file rejected by filter.' });
      }
      // Note: Future architecture should use Signed URLs or direct cloud streams
      // For now, diskStorage prevents immediate OOM, and we pass the path to the adapter
      const result = await uploadFile(req.file.path, req.file.originalname, req.file.mimetype);
      
      // Clean up local temp file after upload if backend is cloud
      if (result.backend !== 'local' && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(201).json({
        message: 'File uploaded successfully',
        url: result.url,
        backend: result.backend,
        mimetype: result.mimetype,
        size: result.size
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  }
];

// Storage info endpoint
router.get('/info', verifyToken, (_req: Request, res: Response) => {
  res.json({ backend: getActiveBackend() });
});

router.post('/image',    ...handleUpload('image'));
router.post('/video',    ...handleUpload('video'));
router.post('/document', ...handleUpload('document'));
router.post('/file',     ...handleUpload('file'));

export default router;
