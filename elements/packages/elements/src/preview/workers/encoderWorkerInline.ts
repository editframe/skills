/**
 * Inline encoder worker - creates a blob URL from inlined worker code.
 * This approach works in any bundler environment (Vite, webpack, etc.)
 * because the worker code is embedded in the bundle rather than loaded
 * from a separate file.
 */

// The worker code as a string. This is the same logic as encoderWorker.ts
// but inlined so it can be converted to a blob URL at runtime.
const workerCode = `
/**
 * Fast base64 encoding directly from Uint8Array.
 */
function encodeBase64Fast(bytes) {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  const len = bytes.length;
  
  while (i < len - 2) {
    const byte1 = bytes[i++];
    const byte2 = bytes[i++];
    const byte3 = bytes[i++];
    
    const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;
    
    result += base64Chars.charAt((bitmap >> 18) & 63);
    result += base64Chars.charAt((bitmap >> 12) & 63);
    result += base64Chars.charAt((bitmap >> 6) & 63);
    result += base64Chars.charAt(bitmap & 63);
  }
  
  if (i < len) {
    const byte1 = bytes[i++];
    const bitmap = byte1 << 16;
    
    result += base64Chars.charAt((bitmap >> 18) & 63);
    result += base64Chars.charAt((bitmap >> 12) & 63);
    
    if (i < len) {
      const byte2 = bytes[i++];
      const bitmap2 = (byte1 << 16) | (byte2 << 8);
      result += base64Chars.charAt((bitmap2 >> 6) & 63);
      result += "=";
    } else {
      result += "==";
    }
  }
  
  return result;
}

// Send a startup message to confirm worker is loaded
postMessage("encoderWorker-loaded");

// Use addEventListener for better compatibility
addEventListener("message", async (event) => {
  const { taskId, bitmap, preserveAlpha } = event.data;
  
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Failed to get 2d context from OffscreenCanvas");
    }
    
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    
    const blob = await canvas.convertToBlob({
      type: preserveAlpha ? "image/png" : "image/jpeg",
      quality: preserveAlpha ? undefined : 0.95,
    });
    
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = encodeBase64Fast(bytes);
    const mimeType = preserveAlpha ? "image/png" : "image/jpeg";
    const dataUrl = \`data:\${mimeType};base64,\${base64}\`;
    
    postMessage({ taskId, dataUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    postMessage({ taskId, dataUrl: "", error: errorMessage });
  }
});
`;

// Cache the blob URL so we only create it once
let cachedBlobUrl: string | null = null;

/**
 * Creates a blob URL for the encoder worker.
 * The blob URL is cached so multiple calls return the same URL.
 * 
 * @returns The blob URL that can be passed to `new Worker(url, { type: "module" })`
 */
export function getEncoderWorkerUrl(): string {
  if (cachedBlobUrl) {
    return cachedBlobUrl;
  }

  const blob = new Blob([workerCode], { type: "application/javascript" });
  cachedBlobUrl = URL.createObjectURL(blob);
  return cachedBlobUrl;
}

/**
 * Revokes the cached blob URL to free memory.
 * Call this when you're done with all workers (e.g., during cleanup).
 */
export function revokeEncoderWorkerUrl(): void {
  if (cachedBlobUrl) {
    URL.revokeObjectURL(cachedBlobUrl);
    cachedBlobUrl = null;
  }
}
