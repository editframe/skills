/**
 * SVG serialization and base64 encoding utilities.
 */

/**
 * Fast base64 encoding directly from Uint8Array.
 * Avoids the overhead of converting to binary string first.
 * Uses lookup table for optimal performance.
 */
export function encodeBase64Fast(bytes: Uint8Array): string {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
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
