import { Task } from "@lit/task";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { EF_INTERACTIVE } from "../EF_INTERACTIVE.js";
import { EFSourceMixin } from "./EFSourceMixin.js";
import { EFTemporal } from "./EFTemporal.js";
import { FetchMixin } from "./FetchMixin.js";

@customElement("ef-image")
export class EFImage extends EFTemporal(
  EFSourceMixin(FetchMixin(LitElement), {
    assetType: "image_files",
  }),
) {
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
      const image = new Image();
      image.src = URL.createObjectURL(await response.blob());

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      if (!this.canvasRef.value) throw new Error("Canvas not ready");
      const ctx = this.canvasRef.value.getContext("2d");
      if (!ctx) throw new Error("Canvas 2d context not ready");
      this.canvasRef.value.width = image.width;
      this.canvasRef.value.height = image.height;
      ctx.drawImage(image, 0, 0);
    },
  });

  frameTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () => [this.fetchImage.status] as const,
    task: async () => {
      await this.fetchImage.taskComplete;
    },
  });

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
