import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import {
  type FrameRenderable,
  type FrameState,
  PRIORITY_IMAGE,
} from "../preview/FrameController.js";
import { EFSourceMixin } from "./EFSourceMixin.js";
import { EFTemporal } from "./EFTemporal.js";
import { FetchMixin } from "./FetchMixin.js";

@customElement("ef-image")
export class EFImage
  extends EFTemporal(
    EFSourceMixin(FetchMixin(LitElement), {
      assetType: "image_files",
    }),
  )
  implements FrameRenderable
{
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        object-fit: contain;
        object-position: center;
      }
      canvas, img {
        width: 100%;
        height: 100%;
        object-fit: inherit;
        object-position: inherit;
      }
    `,
  ];

  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: We need to access super
    const parentAttributes = super.observedAttributes || [];
    return [...parentAttributes, "asset-id"];
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === "asset-id") {
      this.fileId = newValue;
      return;
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }

  imageRef = createRef<HTMLImageElement>();
  canvasRef = createRef<HTMLCanvasElement>();

  /**
   * Render version counter - increments when visual content changes.
   * Used by RenderContext to cache rendered dataURLs.
   */
  #renderVersion = 0;

  /**
   * Get the current render version.
   * Version increments when src or fileId changes.
   * @public
   */
  get renderVersion(): number {
    return this.#renderVersion;
  }

  /**
   * Whether the loaded image has an alpha channel.
   * JPEG images don't have alpha, PNG/WebP may have alpha.
   */
  #hasAlpha = true; // Default to true (preserve alpha) until we know otherwise

  /**
   * Get whether the image has an alpha channel.
   * Used to determine if we should encode as PNG (alpha) or JPEG (no alpha).
   * @public
   */
  get hasAlpha(): boolean {
    return this.#hasAlpha;
  }

  #fileId: string | null = null;

  @property({ type: String, attribute: "file-id", reflect: true })
  set fileId(value: string | null) {
    this.#fileId = value;
  }

  get fileId() {
    return (
      this.#fileId ??
      this.getAttribute("file-id") ??
      this.getAttribute("asset-id")
    );
  }

  /** @deprecated Use fileId instead */
  get assetId(): string | null {
    return this.fileId;
  }
  set assetId(value: string | null) {
    this.fileId = value;
  }

  render() {
    const assetPath = this.assetPath();
    const isDirectUrl = this.isDirectUrl(assetPath);
    return isDirectUrl
      ? html`<img ${ref(this.imageRef)} src=${assetPath} />`
      : html`<canvas ${ref(this.canvasRef)}></canvas>`;
  }

  private isDirectUrl(src: string): boolean {
    // For file-id based URLs (via apiHost), always use fetch+canvas instead of img element
    // This ensures proper rendering in all contexts (server, browser-full-video, browser-frame-by-frame)
    if (this.fileId) {
      return false;
    }
    return (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("data:")
    );
  }

  assetPath() {
    if (this.fileId) {
      const path = `${this.apiHost}/api/v1/files/${this.fileId}`;
      return path;
    }
    if (this.src.startsWith("http://") || this.src.startsWith("https://")) {
      return `/api/v1/assets/remote/image?url=${encodeURIComponent(this.src)}`;
    }
    if (this.isDirectUrl(this.src)) {
      return this.src;
    }
    // Normalize the path: remove leading slash and any double slashes
    let normalizedSrc = this.src.startsWith("/") ? this.src.slice(1) : this.src;
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
  #currentObjectUrl: string | null = null;

  override shouldAutoReady(): boolean {
    return !this.src && !this.fileId;
  }

  /**
   * Load image from the configured source
   */
  async loadImage(signal?: AbortSignal): Promise<void> {
    const assetPath = this.assetPath();

    // Skip if no source
    if (!this.src && !this.fileId) {
      return;
    }

    // Return cached if path hasn't changed
    if (this.#imageLoaded && this.#lastLoadedPath === assetPath) {
      this.setContentReadyState("ready");
      return;
    }

    // Return in-flight promise
    if (this.#imageLoadPromise && this.#lastLoadedPath === assetPath) {
      return this.#imageLoadPromise;
    }

    this.setContentReadyState("loading");

    // For direct URLs, wait for the img element to load
    if (this.isDirectUrl(assetPath)) {
      this.#lastLoadedPath = assetPath;
      this.#imageLoadPromise = this.#waitForImageElement(signal);

      try {
        await this.#imageLoadPromise;
        this.#imageLoaded = true;
        this.setContentReadyState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        console.error("EFImage img element load error", error);
        this.setContentReadyState("error");
        throw error;
      } finally {
        this.#imageLoadPromise = null;
      }
      return;
    }

    this.#lastLoadedPath = assetPath;
    this.#imageLoadPromise = this.#doLoadImage(assetPath, signal);

    try {
      await this.#imageLoadPromise;
      this.#imageLoaded = true;
      this.setContentReadyState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      // Canvas not ready errors are expected during lifecycle
      if (error instanceof Error && error.message === "Canvas not ready") {
        return;
      }
      console.error("EFImage load error", error);
      this.setContentReadyState("error");
    } finally {
      this.#imageLoadPromise = null;
    }
  }

  async #waitForImageElement(signal?: AbortSignal): Promise<void> {
    if (!this.imageRef.value) {
      throw new Error("Image element not ready");
    }

    const img = this.imageRef.value;

    // If already loaded (cached), return immediately
    if (img.complete && img.naturalHeight !== 0) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const abortHandler = () => {
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", abortHandler, { once: true });

      img.onload = () => {
        signal?.removeEventListener("abort", abortHandler);
        resolve();
      };
      img.onerror = (error) => {
        signal?.removeEventListener("abort", abortHandler);
        reject(error);
      };
    });
  }

  async #doLoadImage(assetPath: string, signal?: AbortSignal): Promise<void> {
    const response = await this.fetch(assetPath, { signal });
    signal?.throwIfAborted();

    const image = new Image();
    const blob = await response.blob();
    signal?.throwIfAborted();

    // Detect if image has alpha channel based on MIME type
    // JPEG images don't have alpha, PNG/WebP may have alpha
    const mimeType = blob.type.toLowerCase();
    this.#hasAlpha = !mimeType.includes("jpeg") && !mimeType.includes("jpg");

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
    const ctx = this.canvasRef.value.getContext("2d", {
      willReadFrequently: true,
    });
    if (!ctx) throw new Error("Canvas 2d context not ready");

    // Determine canvas dimensions
    // For SVG images without explicit dimensions, image.width/height may be 0
    // In that case, fall back to naturalWidth/naturalHeight or element's computed size
    let canvasWidth = image.width || image.naturalWidth;
    let canvasHeight = image.height || image.naturalHeight;

    // If still zero (common with SVGs that only have viewBox), use element's computed size
    if (canvasWidth === 0 || canvasHeight === 0) {
      const computedStyle = getComputedStyle(this);
      const elementWidth = parseFloat(computedStyle.width);
      const elementHeight = parseFloat(computedStyle.height);

      // Use element dimensions if available, otherwise use a reasonable default
      if (elementWidth > 0 && elementHeight > 0) {
        canvasWidth = elementWidth;
        canvasHeight = elementHeight;
      } else {
        // Default to 300x150 (standard canvas default size)
        canvasWidth = 300;
        canvasHeight = 150;
      }
    }

    this.canvasRef.value.width = canvasWidth;
    this.canvasRef.value.height = canvasHeight;

    // Ensure the image is fully decoded before drawing
    // This is especially important for SVGs
    try {
      await image.decode();
    } catch (decodeError) {
      // Image decode failed, attempting to draw anyway
    }

    // Clear canvas first to ensure we're starting fresh
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    try {
      ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    } catch (drawError) {
      console.error(`[EFImage] drawImage failed:`, drawError);
      throw drawError;
    }

    // DON'T revoke the URL yet - keep it alive in case we need to redraw
    // URL.revokeObjectURL(image.src);

    // Store the object URL for cleanup later
    if (this.#currentObjectUrl && this.#currentObjectUrl !== image.src) {
      URL.revokeObjectURL(this.#currentObjectUrl);
    }
    this.#currentObjectUrl = image.src;
  }

  // ============================================================================
  // FrameRenderable Implementation
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

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    super.updated(changedProperties);

    if (changedProperties.has("src") || changedProperties.has("fileId")) {
      this.#imageLoaded = false;
      if (
        changedProperties.get("src") !== undefined ||
        changedProperties.get("fileId") !== undefined
      ) {
        this.emitContentChange("source");
      }
      this.loadImage().catch(() => {});
      this.#renderVersion++;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Clean up object URL when element is removed
    if (this.#currentObjectUrl) {
      URL.revokeObjectURL(this.#currentObjectUrl);
      this.#currentObjectUrl = null;
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
