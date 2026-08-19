export const isGoogleDriveUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com/file');
};

export const extractGoogleDriveId = (url: string): string | null => {
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

export const getGoogleDrivePreviewUrl = (url: string): string | null => {
  const id = extractGoogleDriveId(url);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
};
