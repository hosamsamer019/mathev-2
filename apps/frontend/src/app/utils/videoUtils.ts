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

  // Common YouTube URL formats
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|live\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  return null;
};

export const isDirectVideoUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:video/')) return true;
  if (trimmed.includes('/uploads/videos/') || trimmed.includes('/uploads/')) return true;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed);
};

export type VideoSourceType = 'youtube' | 'direct' | 'google-drive' | 'unknown';

export const getVideoSourceType = (url?: string | null): VideoSourceType => {
  if (!url) return 'unknown';
  if (isGoogleDriveUrl(url)) return 'google-drive';
  if (extractYouTubeVideoId(url)) return 'youtube';
  if (isDirectVideoUrl(url)) return 'direct';
  return 'unknown';
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
