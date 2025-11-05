/**
 * Media type detection utilities
 */

export function isAudioUrl(url: string): boolean {
  if (!url) return false;

  // Extract the pathname from URL, handling both full URLs and simple paths
  let pathname: string;
  try {
    const urlObj = new URL(url);
    pathname = urlObj.pathname;
  } catch {
    // If URL parsing fails, treat as simple path
    pathname = url;
  }

  // Remove query parameters and get file extension
  const pathWithoutQuery = pathname.split("?")[0] || "";
  const extension = pathWithoutQuery.split(".").pop()?.toLowerCase();

  // Check for audio file extensions
  const audioExtensions = ["mp3", "wav", "flac", "aac", "m4a", "ogg", "wma"];
  return extension ? audioExtensions.includes(extension) : false;
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;

  // Extract the pathname from URL, handling both full URLs and simple paths
  let pathname: string;
  try {
    const urlObj = new URL(url);
    pathname = urlObj.pathname;
  } catch {
    // If URL parsing fails, treat as simple path
    pathname = url;
  }

  // Remove query parameters and get file extension
  const pathWithoutQuery = pathname.split("?")[0] || "";
  const extension = pathWithoutQuery.split(".").pop()?.toLowerCase();

  // Check for video file extensions
  const videoExtensions = [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "webm",
    "mkv",
    "m4v",
  ];
  return extension ? videoExtensions.includes(extension) : false;
}

/**
 * Check if URL is eligible for JIT transcoding
 */
export function isJitTranscodeEligible(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
