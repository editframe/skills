/**
 * Fast base64 encoding directly from Uint8Array.
 * Avoids the overhead of converting to binary string first.
 * Uses lookup table for optimal performance.
 */
function encodeBase64Fast(bytes: Uint8Array): string {
  const base64Chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  const len = bytes.length;

  // Process 3 bytes at a time (produces 4 base64 chars)
  while (i < len - 2) {
    const byte1 = bytes[i++]!;
    const byte2 = bytes[i++]!;
    const byte3 = bytes[i++]!;

    const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;

    result += base64Chars.charAt((bitmap >> 18) & 63);
    result += base64Chars.charAt((bitmap >> 12) & 63);
    result += base64Chars.charAt((bitmap >> 6) & 63);
    result += base64Chars.charAt(bitmap & 63);
  }

  // Handle remaining bytes (1 or 2)
  if (i < len) {
    const byte1 = bytes[i++]!;
    const bitmap = byte1 << 16;

    result += base64Chars.charAt((bitmap >> 18) & 63);
    result += base64Chars.charAt((bitmap >> 12) & 63);

    if (i < len) {
      const byte2 = bytes[i++]!;
      const bitmap2 = (byte1 << 16) | (byte2 << 8);
      result += base64Chars.charAt((bitmap2 >> 6) & 63);
      result += "=";
    } else {
      result += "==";
    }
  }

  return result;
}

interface EncodeTask {
  taskId: string;
  bitmap: ImageBitmap;
  preserveAlpha: boolean;
}

interface EncodeResult {
  taskId: string;
  dataUrl: string;
  error?: string;
}

// Send a startup message to confirm worker is loaded
postMessage("encoderWorker-loaded");

// Use addEventListener instead of self.onmessage for better compatibility
addEventListener("message", async (event: MessageEvent<EncodeTask>) => {
  const { taskId, bitmap, preserveAlpha } = event.data;

  try {
    // Create OffscreenCanvas from ImageBitmap dimensions
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get 2d context from OffscreenCanvas");
    }

    // Draw ImageBitmap to OffscreenCanvas
    ctx.drawImage(bitmap, 0, 0);

    // Close the ImageBitmap to free memory (it was transferred, so we own it)
    bitmap.close();

    // Convert to blob (JPEG or PNG based on preserveAlpha)
    const blob = await canvas.convertToBlob({
      type: preserveAlpha ? "image/png" : "image/jpeg",
      quality: preserveAlpha ? undefined : 0.95,
    });

    // Convert blob to base64 data URL
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = encodeBase64Fast(bytes);
    const mimeType = preserveAlpha ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Send result back to main thread
    const result: EncodeResult = {
      taskId,
      dataUrl,
    };

    postMessage(result);
  } catch (error) {
    // Send error back to main thread
    const errorMessage = error instanceof Error ? error.message : String(error);

    const result: EncodeResult = {
      taskId,
      dataUrl: "",
      error: errorMessage,
    };

    postMessage(result);
  }
});
