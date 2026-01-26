import { Task, TaskStatus } from "@lit/task";
import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { EF_INTERACTIVE } from "../EF_INTERACTIVE.js";
import type { FrameRenderable, FrameState } from "../preview/FrameController.js";
import { EFSourceMixin } from "./EFSourceMixin.js";
import { EFTemporal } from "./EFTemporal.js";
import { FetchMixin } from "./FetchMixin.js";

@customElement("ef-image")
export class EFImage extends EFTemporal(
  EFSourceMixin(FetchMixin(LitElement), {
    assetType: "image_files",
  }),
) implements FrameRenderable {
  static styles = [
    css`
      :host {
        display: block;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      canvas, img {
        position: static;
        all: initial;
        width: 100%;
        height: 100%;
      }
    `,
  ];

  imageRef = createRef<HTMLImageElement>();
  canvasRef = createRef<HTMLCanvasElement>();

  /**
   * Render version counter - increments when visual content changes.
   * Used by RenderContext to cache rendered dataURLs.
   */
  #renderVersion = 0;

  /**
   * Get the current render version.
   * Version increments when src or assetId changes.
   * @public
   */
  get renderVersion(): number {
    return this.#renderVersion;
  }

  #assetId: string | null = null;
  @property({ type: String, attribute: "asset-id", reflect: true })
  set assetId(value: string | null) {
    this.#assetId = value;
  }

  get assetId() {
    return this.#assetId ?? this.getAttribute("asset-id");
  }

  render() {
    const assetPath = this.assetPath();
    const isDirectUrl = this.isDirectUrl(assetPath);
    return isDirectUrl
      ? html`<img ${ref(this.imageRef)} src=${assetPath} />`
      : html`<canvas ${ref(this.canvasRef)}></canvas>`;
  }

  private isDirectUrl(src: string): boolean {
    return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:");
  }

  assetPath() {
    if (this.assetId) {
      return `${this.apiHost}/api/v1/image_files/${this.assetId}`;
    }
    if (this.isDirectUrl(this.src)) {
      return this.src;
    }
    // Normalize the path: remove leading slash and any double slashes
    let normalizedSrc = this.src.startsWith("/")
      ? this.src.slice(1)
      : this.src;
    normalizedSrc = normalizedSrc.replace(/^\/+/, "");
    // Use production API format for local files
    return `/api/v1/assets/local/image?src=${encodeURIComponent(normalizedSrc)}`;
  }

  get hasOwnDuration() {
    return this.hasExplicitDuration;
  }

  fetchImage = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () => [this.assetPath(), this.fetch, this.src, this.assetId] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to prevent unhandled rejection
      this.fetchImage.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when element is disconnected
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        );
      
      // Also ignore "Canvas not ready" errors - happens during element lifecycle
      const isCanvasNotReady = error instanceof Error && error.message === "Canvas not ready";
      
      if (isAbortError || isCanvasNotReady) {
        return;
      }
      console.error("EFImage fetchImage error", error);
    },
    task: async ([assetPath, fetch, src, assetId], { signal }) => {
      // Skip if no source is set
      if (!src && !assetId) {
        return;
      }

      // For direct URLs, skip task - src is set directly in render
      if (this.isDirectUrl(assetPath)) {
        return;
      }

      // For asset-id and local files, use canvas as before
      const response = await fetch(assetPath, { signal });
      // Check abort after fetch
      signal?.throwIfAborted();
      
      const image = new Image();
      const blob = await response.blob();
      // Check abort after blob conversion
      signal?.throwIfAborted();
      
      image.src = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        // Check abort before setting up image load handlers
        if (signal?.aborted) {
          URL.revokeObjectURL(image.src);
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        
        const abortHandler = () => {
          URL.revokeObjectURL(image.src);
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", abortHandler, { once: true });
        
        image.onload = () => {
          signal?.removeEventListener("abort", abortHandler);
          resolve();
        };
        image.onerror = (error) => {
          signal?.removeEventListener("abort", abortHandler);
          URL.revokeObjectURL(image.src);
          reject(error);
        };
      });

      // Check abort after image load
      signal?.throwIfAborted();

      if (!this.canvasRef.value) throw new Error("Canvas not ready");
      const ctx = this.canvasRef.value.getContext("2d");
      if (!ctx) throw new Error("Canvas 2d context not ready");
      this.canvasRef.value.width = image.width;
      this.canvasRef.value.height = image.height;
      ctx.drawImage(image, 0, 0);
      
      // Clean up object URL after use
      URL.revokeObjectURL(image.src);
    },
  });

  /**
   * @deprecated Use FrameRenderable methods (prepareFrame, renderFrame) via FrameController instead.
   * This is a compatibility wrapper that delegates to the new system.
   */
  frameTask = {
    run: async () => {
      const abortController = new AbortController();
      const timeMs = this.ownCurrentTimeMs;
      await this.prepareFrame(timeMs, abortController.signal);
      this.renderFrame(timeMs);
    },
    taskComplete: Promise.resolve(),
  };

  // ============================================================================
  // FrameRenderable Implementation
  // Centralized frame control - replaces distributed Lit Task system
  // ============================================================================

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   */
  getFrameState(_timeMs: number): FrameState {
    // Image is ready when fetchImage task is complete
    const isComplete = this.fetchImage.status === TaskStatus.COMPLETE;

    return {
      needsPreparation: !isComplete,
      isReady: isComplete,
      priority: 5, // Images render with low priority (usually static)
    };
  }

  /**
   * Async preparation - waits for image to load.
   * @implements FrameRenderable
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    if (this.fetchImage.status !== TaskStatus.COMPLETE) {
      try {
        await this.fetchImage.taskComplete;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          signal.throwIfAborted();
          return;
        }
        throw error;
      }
    }
    signal.throwIfAborted();
  }

  /**
   * Synchronous render - image is already displayed via img element or canvas.
   * @implements FrameRenderable
   */
  renderFrame(_timeMs: number): void {
    // Image is already displayed - no explicit render action needed
  }

  // ============================================================================
  // End FrameRenderable Implementation
  // ============================================================================

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    // Increment render version on any property change.
    // This is intentionally broad to avoid cache staleness - the cache is
    // per-render-session so within a render the version will be stable.
    if (changedProperties.size > 0) {
      this.#renderVersion++;
    }
  }

  /**
   * Get the natural dimensions of the image.
   * Returns null if the image hasn't loaded yet.
   *
   * @public
   */
  getNaturalDimensions(): { width: number; height: number } | null {
    // For direct URLs, check img element
    const img = this.imageRef.value;
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    // For canvas-based images, check canvas dimensions
    const canvas = this.canvasRef.value;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      return {
        width: canvas.width,
        height: canvas.height,
      };
    }

    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-image": EFImage;
  }
}
