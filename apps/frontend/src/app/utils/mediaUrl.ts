/**
 * Media URL Resolver for AL-SADEN Platform
 *
 * Ensures images and media assets load cleanly across all environments:
 * 1. Absolute URLs (Cloudflare R2, Supabase Storage, S3, data:, blob:) -> returned unchanged.
 * 2. Relative URLs (/uploads/...) in production -> returned as relative path (served by Nginx reverse proxy).
 * 3. Relative URLs (/uploads/...) in local development -> resolved to course-service origin (http://localhost:4004)
 *    so the browser requests the image directly from the backend server rather than the Vite dev server (port 5173).
 */
export function getMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already absolute or embedded
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Handle local development where frontend runs on Vite (port 5173) and backend runs on port 4004
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    if (trimmed.startsWith('/uploads')) {
      const envCourseApi = (import.meta as any).env?.VITE_COURSE_API_URL;
      const baseUrl = envCourseApi
        ? envCourseApi.replace(/\/api\/.*$/, '').replace(/\/$/, '')
        : 'http://localhost:4004';
      return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    }
  }

  return trimmed;
}
