import express, { Request, Response } from 'express';
import multer from 'multer';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadFile, getActiveBackend } from '../services/storage.adapter.js';

const router = express.Router();

// Use memory storage — the adapter handles writing to disk or cloud
const memoryUpload = multer({
  storage: multer.memoryStorage(),
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
  memoryUpload.single(fieldName),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or file rejected by filter.' });
      }
      const result = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
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
