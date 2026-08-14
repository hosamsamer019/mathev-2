import { Worker, Job } from 'bullmq';
import { logger, initSentry } from '@shared/utils';
import { db } from '@smartmath/database';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

// Initialize Sentry for background worker
initSentry('video-worker');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'alsaden-videos-prod';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT!,
  credentials: {
    accessKeyId: R2_ACCESS_KEY!,
    secretAccessKey: R2_SECRET_KEY!,
  },
});

interface VideoTranscodeJob {
  uploadId: string;
  storagePath: string; // The S3 Key
}

logger.info('🎥 Video Worker Initializing (HLS FFmpeg Pipeline)...');

const downloadFromR2 = async (key: string, downloadPath: string) => {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  const response = await s3Client.send(command);
  if (!response.Body) throw new Error('Empty body from R2');
  
  const writeStream = fs.createWriteStream(downloadPath);
  await pipeline(response.Body as NodeJS.ReadableStream, writeStream);
};

const uploadToR2 = async (filePath: string, key: string, contentType: string) => {
  const fileStream = fs.createReadStream(filePath);
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  });
  await s3Client.send(command);
};

const transcodeToHLS = (inputPath: string, outputDir: string, job: Job): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Generate Master Playlist & Segments
    // For simplicity in V1, we will generate a single 720p HLS stream. 
    // In Enterprise V2, we will map multiple resolutions.
    const masterPlaylist = path.join(outputDir, 'master.m3u8');
    
    ffmpeg(inputPath)
      .outputOptions([
        '-profile:v main',
        '-vf scale=-2:720',
        '-c:a aac',
        '-ar 48000',
        '-b:a 128k',
        '-c:v h264',
        '-crf 20',
        '-g 48',
        '-keyint_min 48',
        '-sc_threshold 0',
        '-b:v 2500k',
        '-maxrate 2675k',
        '-bufsize 3750k',
        '-hls_time 4',
        '-hls_playlist_type vod',
        '-hls_segment_filename', path.join(outputDir, '720p_%03d.ts')
      ])
      .output(masterPlaylist)
      .on('progress', (progress) => {
        if (progress.percent) {
          job.updateProgress(Math.floor(progress.percent));
        }
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
};

const processVideo = async (job: Job<VideoTranscodeJob>) => {
  const { uploadId, storagePath } = job.data;
  
  logger.info(`[Job ${job.id}] Started processing upload: ${uploadId}`);
  const workDir = path.join(process.cwd(), 'tmp', uploadId);
  fs.mkdirSync(workDir, { recursive: true });
  
  const inputMp4 = path.join(workDir, 'input.mp4');
  
  try {
    await db.videoUpload.update({
      where: { id: uploadId },
      data: { status: 'PROCESSING' }
    });

    logger.info(`[Job ${job.id}] Downloading raw video from R2...`);
    await downloadFromR2(storagePath, inputMp4);

    await db.videoUpload.update({
      where: { id: uploadId },
      data: { status: 'TRANSCODING' }
    });
    
    logger.info(`[Job ${job.id}] Transcoding to HLS...`);
    await transcodeToHLS(inputMp4, workDir, job);
    
    logger.info(`[Job ${job.id}] Uploading HLS segments to R2...`);
    const files = fs.readdirSync(workDir);
    const hlsFolderKey = storagePath.replace('.mp4', '_hls');
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
        const filePath = path.join(workDir, file);
        const s3Key = `${hlsFolderKey}/${file}`;
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
        await uploadToR2(filePath, s3Key, contentType);
      }
    }

    // Finalize
    await db.videoUpload.update({
      where: { id: uploadId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date(),
        // Point the final storage path to the master playlist
        storagePath: `${hlsFolderKey}/master.m3u8`
      }
    });

    logger.info(`[Job ${job.id}] Successfully completed transcoding for: ${uploadId}`);
    return { status: 'success', uploadId };
  } catch (error: any) {
    logger.error(`[Job ${job.id}] Transcoding failed`, error);
    await db.videoUpload.update({
      where: { id: uploadId },
      data: { 
        status: 'FAILED',
        errorMessage: error.message || 'Unknown transcoding error'
      }
    });
    throw error;
  } finally {
    // Cleanup local tmp files
    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }
};

const videoWorker = new Worker('video-transcode-queue', processVideo, {
  connection: {
    host: new URL(REDIS_URL).hostname,
    port: parseInt(new URL(REDIS_URL).port || '6379', 10),
    username: new URL(REDIS_URL).username || undefined,
    password: new URL(REDIS_URL).password || undefined
  },
  concurrency: 2, 
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
