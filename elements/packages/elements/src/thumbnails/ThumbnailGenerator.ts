import type { 
  ThumbnailAddress, 
  CaptureOptions, 
  GenerationResult,
  ThumbnailMetadata
} from "./types.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { captureFromClone } from "../preview/renderTimegroupToCanvas.js";

/**
 * Thumbnail Generator
 * 
 * Responsibilities:
 * - Generate thumbnails from timegroups
 * - Manage render clone lifecycle
 * - Batch generation with streaming results
 * - Handle cancellation
 * 
 * Does NOT know about:
 * - Cache
 * - Viewport
 * - Content versions
 * - Display
 */
export class ThumbnailGenerator {
  // Persistent render clone (reused across captures)
  #clone: EFTimegroup | null = null;
  #cloneContainer: HTMLElement | null = null;
  #cloneElement: EFTimegroup | null = null;
  
  // Abort controller for current batch
  #abortController: AbortController | null = null;

  /**
   * Generate a single thumbnail
   */
  async generate(
    element: EFTimegroup,
    timeMs: number,
    options: CaptureOptions
  ): Promise<GenerationResult> {
    // Use batch generator with single item
    const results: GenerationResult[] = [];
    for await (const result of this.generateBatch(element, [timeMs], options)) {
      results.push(result);
    }
    
    if (results.length === 0) {
      throw new Error(`Failed to generate thumbnail at ${timeMs}ms`);
    }
    
    return results[0]!;
  }

  /**
   * Generate thumbnails in batch, streaming results as they complete
   */
  async *generateBatch(
    element: EFTimegroup,
    times: number[],
    options: CaptureOptions
  ): AsyncGenerator<GenerationResult> {
    console.log(`[ThumbnailGenerator] generateBatch called for ${times.length} times:`, times.map(t => `${(t/1000).toFixed(1)}s`));

    // Create abort controller for this batch
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;
    
    try {
      // Ensure we have a clone
      console.log(`[ThumbnailGenerator] Ensuring clone...`);
      const { clone, container } = await this.#ensureClone(element);
      console.log(`[ThumbnailGenerator] Clone ready`);
      
      // Check if aborted
      if (signal.aborted) {
        console.log(`[ThumbnailGenerator] Aborted before generation`);
        return;
      }
      
      // Generate each thumbnail
      for (let i = 0; i < times.length; i++) {
        const timeMs = times[i]!;
        
        // Check abort before each capture
        if (signal.aborted) {
          console.log(`[ThumbnailGenerator] Batch aborted at ${i}/${times.length}`);
          break;
        }
        
        const startTime = performance.now();
        
        try {
          console.log(`[ThumbnailGenerator] Capturing thumbnail ${i+1}/${times.length} at ${(timeMs/1000).toFixed(1)}s`);
          
          // Seek clone
          await clone.seekForRender(timeMs);
          console.log(`[ThumbnailGenerator] Seeked to ${(timeMs/1000).toFixed(1)}s`);
          
          // Check abort after async operation
          if (signal.aborted) break;
          
          // Capture
          const canvas = await captureFromClone(clone, container, {
            scale: options.scale,
            contentReadyMode: options.contentReadyMode,
            blockingTimeoutMs: options.blockingTimeoutMs,
            originalTimegroup: element,
          });
          console.log(`[ThumbnailGenerator] Captured canvas ${canvas.width}x${canvas.height}`);
          
          // Check abort after async operation
          if (signal.aborted) break;
          
          // Convert to ImageData
          const imageData = this.#canvasToImageData(canvas);
          console.log(`[ThumbnailGenerator] Converted to ImageData ${imageData.width}x${imageData.height}`);
          
          const metadata: ThumbnailMetadata = {
            generatedAt: Date.now(),
            width: imageData.width,
            height: imageData.height,
            generationTimeMs: performance.now() - startTime,
          };
          
          // Create address (note: version will be added by coordinator)
          const address: ThumbnailAddress = {
            elementId: element.id || "unknown",
            contentVersion: 0, // Placeholder - coordinator will set
            timeMs,
          };
          
          yield {
            address,
            data: imageData,
            metadata,
          };
          
          // Yield to main thread every 3 captures
          if ((i + 1) % 3 === 0) {
            await new Promise(resolve => requestAnimationFrame(resolve));
          }
          
        } catch (error) {
          console.warn(`[ThumbnailGenerator] Failed to capture ${timeMs}ms:`, error);
          // Continue to next thumbnail
        }
      }
      
    } finally {
      this.#abortController = null;
    }
  }

  /**
   * Cancel current batch generation
   */
  cancel(): void {
    this.#abortController?.abort();
  }

  /**
   * Dispose of render clone (call when element content changes)
   */
  disposeClone(): void {
    if (this.#cloneContainer) {
      this.#cloneContainer.remove();
    }
    this.#clone = null;
    this.#cloneContainer = null;
    this.#cloneElement = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Implementation
  // ─────────────────────────────────────────────────────────────────────────

  async #ensureClone(element: EFTimegroup): Promise<{ 
    clone: EFTimegroup; 
    container: HTMLElement 
  }> {
    // Reuse existing clone if same element
    if (this.#clone && this.#cloneElement === element) {
      return {
        clone: this.#clone,
        container: this.#cloneContainer!,
      };
    }
    
    // Create new clone
    this.disposeClone();
    
    const { clone, container } = await element.createRenderClone();
    
    this.#clone = clone;
    this.#cloneContainer = container;
    this.#cloneElement = element;
    
    return { clone, container };
  }

  #canvasToImageData(canvas: HTMLCanvasElement): ImageData {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Failed to get 2d context");
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}
