import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMediaUrl } from './mediaUrl';

describe('getMediaUrl', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('returns empty string for null, undefined, or empty values', () => {
    expect(getMediaUrl(null)).toBe('');
    expect(getMediaUrl(undefined)).toBe('');
    expect(getMediaUrl('')).toBe('');
    expect(getMediaUrl('   ')).toBe('');
  });

  it('preserves absolute HTTP and HTTPS URLs', () => {
    const cloudflareR2Url = 'https://pub-abc123.r2.dev/assessment-assets/img-1.png';
    const supabaseUrl = 'https://supabase.co/storage/v1/object/public/uploads/img-2.png';
    const httpUrl = 'http://example.com/images/sample.jpg';

    expect(getMediaUrl(cloudflareR2Url)).toBe(cloudflareR2Url);
    expect(getMediaUrl(supabaseUrl)).toBe(supabaseUrl);
    expect(getMediaUrl(httpUrl)).toBe(httpUrl);
  });

  it('preserves data: and blob: URLs', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blobUrl = 'blob:http://localhost:5173/9a8b7c6d-1234';

    expect(getMediaUrl(dataUrl)).toBe(dataUrl);
    expect(getMediaUrl(blobUrl)).toBe(blobUrl);
  });

  it('resolves relative /uploads URL to backend origin on localhost in development', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', origin: 'http://localhost:5173' },
      writable: true,
    });

    const relativeUrl = '/uploads/assessment-assets/uuid-image-123.png';
    const resolved = getMediaUrl(relativeUrl);
    expect(resolved).toBe('http://localhost:4004/uploads/assessment-assets/uuid-image-123.png');
  });

  it('preserves relative /uploads URL in production (non-localhost)', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'app.saden-math.com', origin: 'https://app.saden-math.com' },
      writable: true,
    });

    const relativeUrl = '/uploads/assessment-assets/uuid-image-123.png';
    const resolved = getMediaUrl(relativeUrl);
    expect(resolved).toBe('/uploads/assessment-assets/uuid-image-123.png');
  });
});
