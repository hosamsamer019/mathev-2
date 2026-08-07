import express, { Request, Response } from 'express';
import multer from 'multer';
import { uploadFile, getActiveBackend } from '../services/storage.adapter.js';

const router = express.Router();

import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!process.env.VERCEL) {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}

import { requestUploadUrl, completeUpload, getUploadStatus } from '../controllers/upload.controller.js';
import { checkRole, verifyToken } from '../middlewares/auth.middleware.js';
import { uploadUrlLimiter } from '../middlewares/rateLimiter.js';

router.post('/request-url', uploadUrlLimiter, verifyToken, checkRole(['TEACHER', 'ADMIN']), requestUploadUrl);
router.post('/:id/complete', verifyToken, completeUpload);
router.get('/:id/status', verifyToken, getUploadStatus);

// Storage info endpoint
router.get('/info', verifyToken, (_req: Request, res: Response) => {
  res.json({ backend: getActiveBackend() });
});

// Legacy fallback direct upload for development
router.post('/direct-local', verifyToken, (req, res) => {
  res.status(400).json({ message: 'Legacy direct local upload disabled in Phase 10' });
});

export default router;
