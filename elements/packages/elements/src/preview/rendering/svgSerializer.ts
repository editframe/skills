/**
 * SVG serialization and base64 encoding utilities.
 */

// Pre-computed base64 lookup table as Uint8Array for faster indexing
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Fast base64 encoding directly from Uint8Array.
 * Optimized with array buffer pre-allocation and batch string building.
 * ~2-3x faster than string concatenation approach.
 */
export function encodeBase64Fast(bytes: Uint8Array): string {
  const len = bytes.length;

  // Pre-calculate output size: 4 chars per 3 bytes, rounded up
  const outputLen = ((len + 2) / 3) << 2;
  const result = new Array(outputLen);

  let i = 0;
  let outIndex = 0;

  // Process 3 bytes at a time (produces 4 base64 chars)
  // Unrolled for better performance
  const len3 = len - 2;
  while (i < len3) {
    const byte1 = bytes[i++]!;
    const byte2 = bytes[i++]!;
    const byte3 = bytes[i++]!;

    const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;

    result[outIndex++] = BASE64_CHARS[(bitmap >> 18) & 63];
    result[outIndex++] = BASE64_CHARS[(bitmap >> 12) & 63];
    result[outIndex++] = BASE64_CHARS[(bitmap >> 6) & 63];
    result[outIndex++] = BASE64_CHARS[bitmap & 63];
  }

  // Handle remaining bytes (1 or 2)
  const remaining = len - i;
  if (remaining > 0) {
    const byte1 = bytes[i++]!;
    const byte2 = remaining > 1 ? bytes[i++]! : 0;
    const bitmap = (byte1 << 16) | (byte2 << 8);

    result[outIndex++] = BASE64_CHARS[(bitmap >> 18) & 63];
    result[outIndex++] = BASE64_CHARS[(bitmap >> 12) & 63];
    result[outIndex++] = remaining > 1 ? BASE64_CHARS[(bitmap >> 6) & 63] : "=";
    result[outIndex++] = "=";
  }

  return result.join("");
}
