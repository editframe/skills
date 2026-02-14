import { defaultProfiler } from "../RenderProfiler.js";

/**
 * Load an image from a data URI. Returns a Promise that resolves when loaded.
 */
export function loadImageFromDataUri(dataUri: string): Promise<HTMLImageElement> {
  const img = new Image();
  const imageLoadStart = performance.now();

  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      defaultProfiler.addTime("imageLoad", performance.now() - imageLoadStart);
      resolve(img);
    };
    img.onerror = reject;
    img.src = dataUri;
  });
}
