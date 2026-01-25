/**
 * Worker that handles full frame serialization: canvas encoding + SVG serialization + base64 encoding.
 * This allows multiple frames to be processed in parallel across the worker pool.
 */

interface CanvasData {
  id: string;
  imageData: ImageData;
  width: number;
  height: number;
  preserveAlpha?: boolean;
}

interface WorkerTask {
  type: 'serialize';
  htmlString: string;
  canvases: CanvasData[];
  width: number;
  height: number;
}

interface WorkerResult {
  svgDataUrl: string;
}

// Log worker startup
self.postMessage({ type: 'ready', worker: 'serializationWorker' });

self.onmessage = async (e: MessageEvent<WorkerTask>) => {
  try {
    const { htmlString, canvases, width, height } = e.data;

    // Phase 1: Encode all canvases to JPEG/PNG data URLs in parallel
    const jpegPromises = canvases.map(async ({ id, imageData, width: w, height: h, preserveAlpha }) => {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(`Failed to get canvas context for ${id}`);
      }

      ctx.putImageData(imageData, 0, 0);

      // Use PNG for transparency, JPEG for opaque canvases
      const format = preserveAlpha ? 'image/png' : 'image/jpeg';
      const quality = preserveAlpha ? undefined : 0.92;

      const blob = await canvas.convertToBlob({ 
        type: format, 
        quality 
      });

      // Convert blob to data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return { id, dataUrl };
    });

    const jpegResults = await Promise.all(jpegPromises);

    // Phase 2: Replace canvas placeholders with image data URLs
    let finalHtml = htmlString;
    for (const { id, dataUrl } of jpegResults) {
      // Find and replace canvas elements with img elements
      // The HTML should have canvas elements with data-canvas-id attribute
      const canvasRegex = new RegExp(
        `<canvas([^>]*data-canvas-id="${id}"[^>]*)>.*?</canvas>`,
        'gs'
      );
      finalHtml = finalHtml.replace(
        canvasRegex,
        (_match, attributes) => {
          // Extract style and other attributes, but replace canvas with img
          return `<img${attributes.replace('canvas', 'img')} src="${dataUrl}" />`;
        }
      );
    }

    // Phase 3: Build SVG string with foreignObject
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${finalHtml}</foreignObject></svg>`;

    // Phase 4: Base64 encode the SVG
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(svgString);

    let base64: string;
    // Use native toBase64 if available (Chromium 128+)
    if (typeof (Uint8Array.prototype as any).toBase64 === 'function') {
      base64 = (utf8Bytes as any).toBase64();
    } else {
      // Fallback: use btoa (less efficient but works everywhere)
      // For large data, process in chunks to avoid string size limits
      const chunkSize = 32768;
      const chunks: string[] = [];
      for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
        const chunk = utf8Bytes.slice(i, i + chunkSize);
        chunks.push(String.fromCharCode(...chunk));
      }
      base64 = btoa(chunks.join(''));
    }

    const svgDataUrl = `data:image/svg+xml;base64,${base64}`;

    self.postMessage({ svgDataUrl } as WorkerResult);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
