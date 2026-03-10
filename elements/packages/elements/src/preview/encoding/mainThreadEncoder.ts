/**
 * Main thread canvas encoding (fallback implementation).
 */

// JPEG quality constants
export const JPEG_QUALITY_HIGH = 0.92;
export const JPEG_QUALITY_MEDIUM = 0.85;

/**
 * Encode a single canvas to a data URL on the main thread (fallback).
 * @param canvas - The canvas to encode
 * @param canvasScale - Scale factor for encoding (default: 1)
 * @returns Encoded result or null if encoding fails
 */
export function encodeCanvasOnMainThread(
  canvas: HTMLCanvasElement,
  canvasScale: number,
): { dataUrl: string; preserveAlpha: boolean } | null {
  try {
    if (canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    const preserveAlpha = canvas.dataset.preserveAlpha === "true";
    let dataUrl: string;

    if (canvasScale < 1) {
      // Scale down canvas before encoding
      const scaledWidth = Math.floor(canvas.width * canvasScale);
      const scaledHeight = Math.floor(canvas.height * canvasScale);
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = scaledWidth;
      scaledCanvas.height = scaledHeight;
      const scaledCtx = scaledCanvas.getContext("2d");
      if (scaledCtx) {
        scaledCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
        const quality = canvasScale < 0.5 ? JPEG_QUALITY_MEDIUM : JPEG_QUALITY_HIGH;
        dataUrl = preserveAlpha
          ? scaledCanvas.toDataURL("image/png")
          : scaledCanvas.toDataURL("image/jpeg", quality);
      } else {
        dataUrl = preserveAlpha
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", JPEG_QUALITY_HIGH);
      }
    } else {
      dataUrl = preserveAlpha
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", JPEG_QUALITY_HIGH);
    }

    return { dataUrl, preserveAlpha };
  } catch (_e) {
    // Cross-origin canvas or other error - skip
    return null;
  }
}
