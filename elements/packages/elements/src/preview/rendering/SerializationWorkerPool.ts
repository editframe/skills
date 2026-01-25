/**
 * Specialized worker pool for frame serialization.
 * Manages parallel execution of canvas encoding + SVG serialization + base64 encoding across frames.
 */

import { WorkerPool } from "../workers/WorkerPool.js";
import { logger } from "../logger.js";

interface CanvasData {
  id: string;
  imageData: ImageData;
  width: number;
  height: number;
  preserveAlpha?: boolean;
}

interface SerializationTask {
  type: 'serialize';
  htmlString: string;
  canvases: CanvasData[];
  width: number;
  height: number;
}

interface SerializationResult {
  svgDataUrl: string;
}

interface SerializationError {
  error: string;
}

type SerializationResponse = SerializationResult | SerializationError;

// Module-level singleton
let _serializationPool: SerializationWorkerPool | null = null;
let _initWarningLogged = false;

/**
 * Get or create the serialization worker pool.
 * Returns null if workers are not available.
 */
export function getSerializationWorkerPool(): SerializationWorkerPool | null {
  if (_serializationPool) {
    return _serializationPool;
  }

  try {
    _serializationPool = new SerializationWorkerPool();
    
    if (!_serializationPool.isAvailable()) {
      _serializationPool.terminate();
      _serializationPool = null;
      
      if (!_initWarningLogged) {
        _initWarningLogged = true;
        logger.warn(
          "[SerializationWorkerPool] Workers not available, will use main thread serialization"
        );
      }
    }
  } catch (error) {
    _serializationPool = null;
    
    if (!_initWarningLogged) {
      _initWarningLogged = true;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `[SerializationWorkerPool] Failed to create worker pool: ${errorMessage}`
      );
    }
  }

  return _serializationPool;
}

/**
 * Reset the serialization worker pool (for testing).
 */
export function resetSerializationWorkerPool(): void {
  if (_serializationPool) {
    _serializationPool.terminate();
    _serializationPool = null;
  }
  _initWarningLogged = false;
}

export class SerializationWorkerPool {
  #workerPool: WorkerPool;
  #workerUrl: string;

  constructor(poolSize?: number) {
    // Create inline worker URL from the serialization worker code
    this.#workerUrl = this.createWorkerUrl();
    
    // Use hardware concurrency or default to 8 workers
    const size = poolSize ?? (navigator.hardwareConcurrency || 8);
    this.#workerPool = new WorkerPool(this.#workerUrl, size);
  }

  /**
   * Create a blob URL for the serialization worker.
   * This embeds the worker code inline so it works with any bundler.
   */
  private createWorkerUrl(): string {
    // Read the worker code from the separate file
    // In production, bundlers will inline this as a string
    const workerCode = `
/**
 * Worker that handles full frame serialization: canvas encoding + SVG serialization + base64 encoding.
 */

self.postMessage({ type: 'ready', worker: 'serializationWorker' });

self.onmessage = async (e) => {
  try {
    const { htmlString, canvases, width, height } = e.data;

    // Phase 1: Encode all canvases to JPEG/PNG data URLs in parallel
    const jpegPromises = canvases.map(async ({ id, imageData, width: w, height: h, preserveAlpha }) => {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(\`Failed to get canvas context for \${id}\`);
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
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return { id, dataUrl };
    });

    const jpegResults = await Promise.all(jpegPromises);

    // Phase 2: Replace canvas placeholders with image data URLs
    let finalHtml = htmlString;
    for (const { id, dataUrl } of jpegResults) {
      const canvasRegex = new RegExp(
        \`<canvas([^>]*data-canvas-id="\${id}"[^>]*)>.*?</canvas>\`,
        'gs'
      );
      finalHtml = finalHtml.replace(
        canvasRegex,
        (_match, attributes) => {
          return \`<img\${attributes.replace('canvas', 'img')} src="\${dataUrl}" />\`;
        }
      );
    }

    // Phase 3: Build SVG string with foreignObject
    const svgString = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${width}" height="\${height}"><foreignObject width="100%" height="100%">\${finalHtml}</foreignObject></svg>\`;

    // Phase 4: Base64 encode the SVG
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(svgString);

    let base64;
    if (typeof Uint8Array.prototype.toBase64 === 'function') {
      base64 = utf8Bytes.toBase64();
    } else {
      const chunkSize = 32768;
      const chunks = [];
      for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
        const chunk = utf8Bytes.slice(i, i + chunkSize);
        chunks.push(String.fromCharCode(...chunk));
      }
      base64 = btoa(chunks.join(''));
    }

    const svgDataUrl = \`data:image/svg+xml;base64,\${base64}\`;

    self.postMessage({ svgDataUrl });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  /**
   * Check if the worker pool is available and ready.
   */
  isAvailable(): boolean {
    return this.#workerPool.isAvailable();
  }

  /**
   * Get the number of workers in the pool.
   */
  get workerCount(): number {
    return this.#workerPool.workerCount;
  }

  /**
   * Serialize a frame: encode canvases, build SVG, and base64 encode.
   * This can be called for multiple frames in parallel.
   */
  async serializeFrame(
    htmlString: string,
    canvases: CanvasData[],
    width: number,
    height: number
  ): Promise<string> {
    const task: SerializationTask = {
      type: 'serialize',
      htmlString,
      canvases,
      width,
      height
    };

    return this.#workerPool.execute<string>(async (worker) => {
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Serialization worker timeout after 10s'));
        }, 10000);

        const messageHandler = (e: MessageEvent<SerializationResponse>) => {
          // Skip ready messages
          if (e.data && typeof e.data === 'object' && 'type' in e.data && e.data.type === 'ready') {
            return;
          }

          clearTimeout(timeout);
          worker.removeEventListener('message', messageHandler);

          if (!e.data) {
            reject(new Error('Worker returned empty data'));
          } else if ('error' in e.data) {
            reject(new Error(e.data.error));
          } else if ('svgDataUrl' in e.data) {
            resolve(e.data.svgDataUrl);
          } else {
            reject(new Error('Worker returned unexpected data format'));
          }
        };

        worker.addEventListener('message', messageHandler);
        worker.postMessage(task);
      });
    });
  }

  /**
   * Terminate all workers and clean up resources.
   */
  terminate(): void {
    this.#workerPool.terminate();
    
    // Clean up the blob URL
    if (this.#workerUrl) {
      URL.revokeObjectURL(this.#workerUrl);
    }
  }
}
