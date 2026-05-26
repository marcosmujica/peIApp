/**
 * Normalizes a URL from the API/Database.
 * If the URL is absolute but points to an old IP/localhost, it replaces it with the current environment's base URL.
 */
export const normalizeUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  
  const base = (process.env.EXPO_PUBLIC_AVATARS_URL || 'https://api.peiapp.tech').replace(/\/$/, '');

  // If it's already a full URL with content:// or file:// (local photos), return as is
  if (url.startsWith('content://') || url.startsWith('file://')) {
    return url;
  }

  // If it's a relative path (starts with / or is just a path like "uploads/...")
  if (url.startsWith('/') || (!url.startsWith('http') && url.includes('/'))) {
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${base}${cleanUrl}`;
  }

  // If it's an absolute URL, check if it points to a local address or matches common dev patterns
  if (url.startsWith('http')) {
    const isInternalPath = url.includes('/uploads/');
    const localPatterns = [/localhost/i, /127\.0\.0\.1/i, /192\.168\.\d+\.\d+/i, /172\.\d+\.\d+\.\d+/i, /10\.\d+\.\d+\.\d+/i];
    const isLocal = localPatterns.some(pattern => pattern.test(url));
    
    if (isInternalPath && isLocal) {
      const parts = url.split('/uploads/');
      const filePath = parts.pop();
      return `${base}/uploads/${filePath}`;
    }
  }

  return url;
};

// Alias for backward compatibility or thematic naming
export const normalizeAvatarUrl = normalizeUrl;
