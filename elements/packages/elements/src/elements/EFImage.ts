import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import {
  type FrameRenderable,
  type FrameState,
  createFrameTaskWrapper,
  PRIORITY_IMAGE,
} from "../preview/FrameController.js";
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

  // ============================================================================
  // Image Loading - async method instead of Task
  // ============================================================================

  #imageLoaded = false;
  #imageLoadPromise: Promise<void> | null = null;
  #lastLoadedPath: string | null = null;

  /**
   * Load image from the configured source
   */
  async loadImage(signal?: AbortSignal): Promise<void> {
    const assetPath = this.assetPath();

    // Skip if no source
    if (!this.src && !this.assetId) {
      return;
    }

    // Return cached if path hasn't changed
    if (this.#imageLoaded && this.#lastLoadedPath === assetPath) {
      return;
    }

    // Return in-flight promise
    if (this.#imageLoadPromise && this.#lastLoadedPath === assetPath) {
      return this.#imageLoadPromise;
    }

    // For direct URLs, the img element handles loading
    if (this.isDirectUrl(assetPath)) {
      this.#imageLoaded = true;
      this.#lastLoadedPath = assetPath;
      return;
    }

    this.#lastLoadedPath = assetPath;
    this.#imageLoadPromise = this.#doLoadImage(assetPath, signal);

    try {
      await this.#imageLoadPromise;
      this.#imageLoaded = true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      // Canvas not ready errors are expected during lifecycle
      if (error instanceof Error && error.message === "Canvas not ready") {
        return;
      }
      console.error("EFImage load error", error);
    } finally {
      this.#imageLoadPromise = null;
    }
  }

  async #doLoadImage(assetPath: string, signal?: AbortSignal): Promise<void> {
    const response = await this.fetch(assetPath, { signal });
    signal?.throwIfAborted();
    
    const image = new Image();
    const blob = await response.blob();
    signal?.throwIfAborted();
    
    image.src = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
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

    signal?.throwIfAborted();

    if (!this.canvasRef.value) throw new Error("Canvas not ready");
    const ctx = this.canvasRef.value.getContext("2d");
    if (!ctx) throw new Error("Canvas 2d context not ready");
    this.canvasRef.value.width = image.width;
    this.canvasRef.value.height = image.height;
    ctx.drawImage(image, 0, 0);
    
    URL.revokeObjectURL(image.src);
  }

  /**
   * @deprecated Use FrameRenderable methods (prepareFrame, renderFrame) via FrameController instead.
   * This is a compatibility wrapper that delegates to the new system.
   */
  frameTask = createFrameTaskWrapper(this);

  // ============================================================================
  // FrameRenderable Implementation
  // Centralized frame control - no Lit Tasks
  // ============================================================================

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   */
  getFrameState(_timeMs: number): FrameState {
    return {
      needsPreparation: !this.#imageLoaded,
      isReady: this.#imageLoaded,
      priority: PRIORITY_IMAGE,
    };
  }

  /**
   * Async preparation - waits for image to load.
   * @implements FrameRenderable
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    await this.loadImage(signal);
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
    
    // Trigger image load when src or assetId changes
    if (changedProperties.has("src") || changedProperties.has("assetId")) {
      this.#imageLoaded = false;
      this.loadImage().catch(() => {});
    }

    // Increment render version on any property change.
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
