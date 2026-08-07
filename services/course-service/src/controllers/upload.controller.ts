import { Response } from 'express';
import { generateSignedUploadUrl, getActiveBackend } from '../services/storage.adapter.js';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const requestUploadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { filename, mimetype, fileSize } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!filename || !mimetype || !fileSize) {
      return res.status(400).json({ message: 'Missing file metadata' });
    }

    // 1. Generate Cloudflare R2 Signed URL
    const { signedUrl, storagePath, backend } = await generateSignedUploadUrl(
      userId,
      filename,
      mimetype,
      fileSize
    );

    // 2. Create VideoUpload record in database with PENDING status
    const upload = await (db as any).videoUpload.create({
      data: {
        userId,
        filename,
        storagePath,
        mimeType: mimetype,
        fileSize,
        status: 'PENDING'
      }
    });

    res.status(200).json({
      uploadId: upload.id,
      signedUrl,
      storagePath,
      backend
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate upload URL', error: error.message });
  }
};

export const completeUpload = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const upload = await (db as any).videoUpload.findUnique({ where: { id } });
    if (!upload) return res.status(404).json({ message: 'Upload not found' });
    if (upload.userId !== userId) return res.status(403).json({ message: 'Forbidden' });

    // Mark as UPLOAD_COMPLETED. The BullMQ worker will pick this up automatically or via event.
    // For now, we update the status.
    const updated = await (db as any).videoUpload.update({
      where: { id },
      data: { status: 'UPLOAD_COMPLETED' }
    });

    // TODO: Send Job to BullMQ Video Worker Queue
    import('bullmq').then(({ Queue }) => {
      const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
      const videoQueue = new Queue('video-transcode-queue', { connection: { url: REDIS_URL } as any });
      videoQueue.add('transcode', { uploadId: id, storagePath: upload.storagePath });
    }).catch(err => console.error('Failed to enqueue video processing job', err));

    res.status(200).json({ message: 'Upload completed and queued for processing', upload: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to complete upload', error: error.message });
  }
};

export const getUploadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const upload = await (db as any).videoUpload.findUnique({ where: { id } });
    if (!upload) return res.status(404).json({ message: 'Upload not found' });
    if (upload.userId !== userId) return res.status(403).json({ message: 'Forbidden' });

    res.status(200).json(upload);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch status', error: error.message });
  }
};
