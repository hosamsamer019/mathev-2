import { Worker, Job } from 'bullmq';
import { logger, initSentry } from '@shared/utils';
import { db } from '@shared/database';

// Initialize Sentry for background worker
initSentry('video-worker');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface VideoTranscodeJob {
  uploadId: string;
  storagePath: string;
}

logger.info('🎥 Video Worker Initializing...');

/**
 * FFmpeg processing skeleton.
 * In a full deployment, this calls fluent-ffmpeg to pull the MP4,
 * transcode to HLS (1080p, 720p, 360p), extract a thumbnail, and push back to S3/Cloudflare R2.
 */
const processVideo = async (job: Job<VideoTranscodeJob>) => {
  const { uploadId, storagePath } = job.data;
  
  logger.info(`[Job ${job.id}] Started processing upload: ${uploadId}`);
  
  try {
    // 1. Mark as PROCESSING in database
    await db.videoUpload.update({
      where: { id: uploadId },
      data: { status: 'PROCESSING' }
    });
    await job.updateProgress(10);

    // 2. Transcoding Step (Skeleton)
    logger.info(`[Job ${job.id}] Transcoding to HLS (1080p, 720p, 360p)...`);
    await db.videoUpload.update({
      where: { id: uploadId },
      data: { status: 'TRANSCODING' }
    });
    
    // Simulate FFmpeg heavy lifting
    await new Promise(resolve => setTimeout(resolve, 5000));
    await job.updateProgress(80);

    // 3. Mark as COMPLETED
    await db.videoUpload.update({
      where: { id: uploadId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    logger.info(`[Job ${job.id}] Successfully completed transcoding for: ${uploadId}`);
    return { status: 'success', uploadId };
  } catch (error: any) {
    logger.error(`[Job ${job.id}] Transcoding failed`, error);
    
    // Mark as FAILED
    await db.videoUpload.update({
      where: { id: uploadId },
      data: { 
        status: 'FAILED',
        errorMessage: error.message || 'Unknown transcoding error'
      }
    });
    throw error;
  }
};

// Create the BullMQ Worker
const videoWorker = new Worker('video-transcode-queue', processVideo, {
  connection: {
    url: REDIS_URL
  },
  concurrency: 2, // Limit concurrent FFmpeg processes to avoid CPU starvation
});

videoWorker.on('completed', (job) => {
  logger.info(`Job with id ${job.id} has been completed`);
});

videoWorker.on('failed', (job, err) => {
  logger.error(`Job with id ${job?.id} has failed with ${err.message}`);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down worker gracefully...');
  await videoWorker.close();
  process.exit(0);
});
