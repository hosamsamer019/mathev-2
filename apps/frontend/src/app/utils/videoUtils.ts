export const isGoogleDriveUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com/file');
};

export const extractGoogleDriveId = (url?: string | null): string | null => {
  if (!url) return null;
  // Match standard /file/d/ID/view or edit or preview
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Match id=ID
  const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  return null;
};

export const getGoogleDrivePreviewUrl = (url?: string | null): string | null => {
  const id = extractGoogleDriveId(url);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
};

export const extractYouTubeVideoId = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();

  // If already an 11-character YouTube ID directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL formats (watch, youtu.be, embed, shorts, live, etc.)
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|live\/|shorts\/|watch\?(?:.*&)?v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  return null;
};

export const extractVimeoId = (url?: string | null): string | null => {
  if (!url) return null;
  const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  return match && match[1] ? match[1] : null;
};

export const isDirectVideoUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:video/')) return true;
  if (trimmed.includes('/uploads/videos/') || trimmed.includes('/uploads/')) return true;
  return /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i.test(trimmed);
};

export type VideoSourceType = 'youtube' | 'direct' | 'google-drive' | 'vimeo' | 'unknown';

export const getVideoSourceType = (url?: string | null): VideoSourceType => {
  if (!url) return 'unknown';
  if (isGoogleDriveUrl(url)) return 'google-drive';
  if (extractYouTubeVideoId(url)) return 'youtube';
  if (extractVimeoId(url)) return 'vimeo';
  if (isDirectVideoUrl(url)) return 'direct';
  return 'unknown';
};

export const getNormalizedVideoUrl = (url?: string | null): string => {
  if (!url) return '';
  const trimmed = url.trim();
  // Handle relative uploads if running on client
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return trimmed;
};

export const getVideoThumbnailUrl = (videoUrl?: string | null): string => {
  const defaultThumb = 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=800&h=450&fit=crop';
  if (!videoUrl) return defaultThumb;

  const ytId = extractYouTubeVideoId(videoUrl);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  return defaultThumb;
};

export const formatVideoTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const paddedMins = String(mins).padStart(2, '0');
  const paddedSecs = String(secs).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
};

export const formatVideoTimeRemaining = (current: number, duration: number): string => {
  if (!duration || isNaN(duration) || duration <= 0) return '00:00';
  const remaining = Math.max(0, duration - (current || 0));
  return `-${formatVideoTime(remaining)}`;
};

export const getLessonMediaStreamUrl = (lessonId: string, token?: string): string => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const baseUrl = env.VITE_COURSE_API_URL || '/api/courses';
  const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') || '';
  return `${baseUrl}/lessons/${lessonId}/stream${authToken ? `?token=${encodeURIComponent(authToken)}` : ''}`;
};

