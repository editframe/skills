/**
 * Inline encoder worker - creates a blob URL from inlined worker code.
 * This approach works in any bundler environment (Vite, webpack, etc.)
 * because the worker code is embedded in the bundle rather than loaded
 * from a separate file.
 */

// The worker code as a string. This is the same logic as encoderWorker.ts
// but inlined so it can be converted to a blob URL at runtime.
const workerCode = `
// Send a startup message to confirm worker is loaded
postMessage("encoderWorker-loaded");

// Use addEventListener for better compatibility
addEventListener("message", async (event) => {
  const { taskId, bitmap, preserveAlpha, targetWidth, targetHeight } = event.data;

  try {
    // Resize to target dimensions in worker (ARCHITECTURE.md §2.4)
    const w = targetWidth || bitmap.width;
    const h = targetHeight || bitmap.height;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get 2d context from OffscreenCanvas");
    }

    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await canvas.convertToBlob({
      type: preserveAlpha ? "image/png" : "image/jpeg",
      quality: preserveAlpha ? undefined : 0.95,
    });

    // ARCHITECTURE.md §4.4: chunked String.fromCharCode + native btoa
    // Native btoa is implemented in C++ and ~100x faster than JS-based
    // base64 encoding for large payloads (e.g. 2MB PNG blobs).
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    const mimeType = preserveAlpha ? "image/png" : "image/jpeg";
    const dataUrl = "data:" + mimeType + ";base64," + btoa(binary);

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
