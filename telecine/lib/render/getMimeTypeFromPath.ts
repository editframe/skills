import { extname } from "node:path";

/**
 * Get MIME type from file path based on file extension.
 * Returns a MIME type string or null if the extension is unknown.
 *
 * @param filePath - The file path (can include query parameters)
 * @returns MIME type string or null if unknown
 */
export function getMimeTypeFromPath(filePath: string): string | null {
  // Remove query parameters if present
  const pathWithoutQuery = filePath.split("?")[0] || filePath;

  // Get file extension
  const extension = extname(pathWithoutQuery).toLowerCase().slice(1); // Remove the dot

  if (!extension) {
    return null;
  }

  // Map of common file extensions to MIME types
  const mimeTypeMap: Record<string, string> = {
    // Video formats
    mp4: "video/mp4",
    webm: "video/webm",
    m4v: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    mkv: "video/x-matroska",
    m4s: "video/iso.segment", // ISO Base Media file segment

    // Audio formats
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    wav: "audio/wav",
    flac: "audio/flac",
    wma: "audio/x-ms-wma",

    // Image formats
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",

    // Other formats
    json: "application/json",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    pdf: "application/pdf",
  };

  return mimeTypeMap[extension] || null;
}
