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
import { StorageClient } from '@supabase/storage-js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '@shared/utils';

export type StorageBackend = 'supabase' | 'local';

export interface UploadResult {
  url: string;
  backend: StorageBackend;
  filename: string;
  mimetype: string;
  size: number;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'platform-uploads';

let supabaseStorage: StorageClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabaseStorage = new StorageClient(`${SUPABASE_URL}/storage/v1`, {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  });
  logger.info('[Storage] Backend: Supabase Storage');
} else {
  logger.info('[Storage] Backend: Local Disk (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable cloud storage)');
}

/**
 * Upload a buffer to the configured storage backend.
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<UploadResult> {
  const ext = path.extname(originalName);
  const filename = `${randomUUID()}${ext}`;

  if (supabaseStorage) {
    // Supabase Storage upload
    const { error } = await supabaseStorage
      .from(SUPABASE_BUCKET)
      .upload(filename, buffer, { contentType: mimetype, upsert: false });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data } = supabaseStorage.from(SUPABASE_BUCKET).getPublicUrl(filename);

    return {
      url: data.publicUrl,
      backend: 'supabase',
      filename,
      mimetype,
      size: buffer.length,
    };
  } else {
    // Local disk fallback
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), buffer);

    return {
      url: `/uploads/${filename}`,
      backend: 'local',
      filename,
      mimetype,
      size: buffer.length,
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
