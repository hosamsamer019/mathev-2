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
 * Validate image buffer against actual magic byte signatures and MIME specifications.
 * Prevents disguised executables, scripts, and malformed files from being uploaded.
 */
export function validateImageSignature(
  buffer: Buffer,
  declaredMimeType: string,
  originalName: string
): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file buffer' };
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit for question images
  if (buffer.length > MAX_SIZE) {
    return { valid: false, error: 'File exceeds 10MB size limit' };
  }

  const ext = path.extname(originalName).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: `Invalid file extension "${ext}". Allowed: ${allowedExtensions.join(', ')}` };
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimes.includes(declaredMimeType.toLowerCase())) {
    return { valid: false, error: `Invalid MIME type "${declaredMimeType}". Allowed: ${allowedMimes.join(', ')}` };
  }

  // Executable and script signature rejections
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, error: 'Executable file disguised as image is rejected (MZ signature)' };
  }
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, error: 'ELF binary disguised as image is rejected' };
  }
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { valid: false, error: 'Zip/Archive disguised as image is rejected' };
  }

  // Check initial text for script injection
  const headStr = buffer.subarray(0, Math.min(buffer.length, 128)).toString('utf8').toLowerCase();
  if (headStr.includes('<script') || headStr.includes('<?php') || headStr.startsWith('#!') || headStr.includes('<html')) {
    return { valid: false, error: 'Script or HTML file disguised as image is rejected' };
  }

  // Magic bytes inspection
  // JPEG: FF D8 FF
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;

  // WebP: RIFF ... WEBP
  const isWebP = buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  // GIF: GIF87a or GIF89a
  const isGif = buffer.length >= 6 &&
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61;

  let detectedMime: string | null = null;
  if (isJpeg) detectedMime = 'image/jpeg';
  else if (isPng) detectedMime = 'image/png';
  else if (isWebP) detectedMime = 'image/webp';
  else if (isGif) detectedMime = 'image/gif';

  if (!detectedMime) {
    return { valid: false, error: 'File content does not match a valid image signature (JPEG, PNG, WebP, GIF)' };
  }

  const normalizedDeclared = declaredMimeType.toLowerCase();
  if (normalizedDeclared !== detectedMime) {
    return {
      valid: false,
      error: `MIME type mismatch: declared "${declaredMimeType}" but detected "${detectedMime}"`
    };
  }

  return { valid: true, detectedMime };
}

/**
 * Upload a memory buffer directly to the configured storage backend.
 */
export async function uploadBuffer(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  keyPrefix = 'assessment-assets'
): Promise<UploadResult> {
  const ext = path.extname(originalName).toLowerCase();
  const safeFilename = `${keyPrefix}/${randomUUID()}${ext}`;

  if (activeBackend === 'r2' && s3Client) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: safeFilename,
      Body: buffer,
      ContentType: mimetype,
    });
    await s3Client.send(command);

    const publicUrl = R2_PUBLIC
      ? `${R2_PUBLIC.replace(/\/$/, '')}/${safeFilename}`
      : `https://${R2_BUCKET}.r2.cloudflarestorage.com/${safeFilename}`;

    return {
      url: publicUrl,
      backend: 'r2',
      filename: safeFilename,
      mimetype,
      size: buffer.length,
    };
  } else if (supabaseStorage) {
    const { error } = await supabaseStorage
      .from(SUPABASE_BUCKET)
      .upload(safeFilename, buffer, { contentType: mimetype, upsert: false });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data } = supabaseStorage.from(SUPABASE_BUCKET).getPublicUrl(safeFilename);

    return {
      url: data.publicUrl,
      backend: 'supabase',
      filename: safeFilename,
      mimetype,
      size: buffer.length,
    };
  } else {
    // Local disk fallback
    const uploadDir = path.join(process.cwd(), 'uploads', keyPrefix);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const localFileName = path.basename(safeFilename);
    const fullPath = path.join(uploadDir, localFileName);
    fs.writeFileSync(fullPath, buffer);

    return {
      url: `/uploads/${keyPrefix}/${localFileName}`,
      backend: 'local',
      filename: safeFilename,
      mimetype,
      size: buffer.length,
    };
  }
}

/**
 * Upload a file from disk to the configured storage backend.
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
 * Delete a file from the configured storage backend (idempotent).
 */
export async function deleteFile(filename: string): Promise<void> {
  if (!filename) return;

  // Sanitize path traversal attempts
  if (filename.includes('..')) {
    throw new Error('Invalid storage key: path traversal detected');
  }

  if (activeBackend === 'r2' && s3Client) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: filename,
      });
      await s3Client.send(command);
    } catch (err: any) {
      logger.warn(`[Storage] S3/R2 delete warning for ${filename}: ${err.message}`);
    }
  } else if (supabaseStorage) {
    try {
      const { error } = await supabaseStorage.from(SUPABASE_BUCKET).remove([filename]);
      if (error) logger.warn(`[Storage] Supabase delete warning for ${filename}: ${error.message}`);
    } catch (err: any) {
      logger.warn(`[Storage] Supabase delete error for ${filename}: ${err.message}`);
    }
  } else {
    try {
      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err: any) {
      logger.warn(`[Storage] Local delete warning for ${filename}: ${err.message}`);
    }
  }
}


