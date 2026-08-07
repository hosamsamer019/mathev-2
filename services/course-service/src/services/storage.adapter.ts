/**
 * Storage Adapter — Production-Grade
 *
 * Automatically detects and selects the best available backend:
 *   1. Supabase Storage (if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set)
 *   2. AWS S3 (if AWS_S3_BUCKET is set)  ← future extension point
 *   3. Local Disk (multer) — development fallback
 *
 * All upload routes in upload.routes.ts should use this adapter instead
 * of writing directly to disk. Swap the backend by adding env vars — no
 * code changes required.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageClient } from '@supabase/storage-js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '@shared/utils';

export type StorageBackend = 'r2' | 'supabase' | 'local';

export interface UploadResult {
  url: string;
  backend: StorageBackend;
  filename: string;
  mimetype: string;
  size: number;
}

// Environment variables
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'alsaden-videos-prod';
const R2_PUBLIC = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'platform-uploads';

let s3Client: S3Client | null = null;
let supabaseStorage: StorageClient | null = null;
let activeBackend: StorageBackend = 'local';

if (R2_ENDPOINT && R2_ACCESS_KEY && R2_SECRET_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  });
  activeBackend = 'r2';
  logger.info('[Storage] Backend: Cloudflare R2');
} else if (SUPABASE_URL && SUPABASE_KEY) {
  supabaseStorage = new StorageClient(`${SUPABASE_URL}/storage/v1`, {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  });
  activeBackend = 'supabase';
  logger.info('[Storage] Backend: Supabase Storage');
} else {
  logger.info('[Storage] Backend: Local Disk (Fallback)');
}

export function getActiveBackend(): StorageBackend {
  return activeBackend;
}

/**
 * Generate a Signed Upload URL for direct client-to-cloud uploading.
 */
export async function generateSignedUploadUrl(
  userId: string,
  filename: string,
  mimetype: string,
  fileSize: number
) {
  const ext = path.extname(filename);
  const uuidFilename = `${userId}/${randomUUID()}${ext}`;

  if (activeBackend === 'r2' && s3Client) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: uuidFilename,
      ContentType: mimetype,
    });
    
    // URL expires in 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return { signedUrl, storagePath: uuidFilename, backend: activeBackend };
  } else if (activeBackend === 'supabase' && supabaseStorage) {
    throw new Error('Signed URLs require Cloudflare R2 / S3 compatible storage');
  } else {
    // Local fallback: Return an internal route URL for direct POST
    return { 
      signedUrl: `/api/uploads/direct-local`, 
      storagePath: uuidFilename, 
      backend: 'local' 
    };
  }
}

/**
 * Upload a file to the configured storage backend.
 */
export async function uploadFile(
  filePath: string,
  originalName: string,
  mimetype: string
): Promise<UploadResult> {
  const ext = path.extname(originalName);
  const filename = `${randomUUID()}${ext}`;

  if (supabaseStorage) {
    const fileStream = fs.createReadStream(filePath);
    const { error } = await supabaseStorage
      .from(SUPABASE_BUCKET)
      .upload(filename, fileStream, { contentType: mimetype, upsert: false });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data } = supabaseStorage.from(SUPABASE_BUCKET).getPublicUrl(filename);

    return {
      url: data.publicUrl,
      backend: 'supabase',
      filename,
      mimetype,
      size: fs.statSync(filePath).size,
    };
  } else {
    // Local disk fallback: The file is already on disk (uploaded by multer to uploads dir)
    // We just rename it to the UUID filename.
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const newPath = path.join(uploadDir, filename);
    fs.renameSync(filePath, newPath);

    return {
      url: `/uploads/${filename}`,
      backend: 'local',
      filename,
      mimetype,
      size: fs.statSync(newPath).size,
    };
  }
}

/**
 * Delete a file from the configured storage backend.
 */
export async function deleteFile(filename: string): Promise<void> {
  if (supabaseStorage) {
    const { error } = await supabaseStorage.from(SUPABASE_BUCKET).remove([filename]);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  } else {
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

export function getActiveBackend(): StorageBackend {
  return supabaseStorage ? 'supabase' : 'local';
}
