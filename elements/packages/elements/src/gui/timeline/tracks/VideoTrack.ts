import { consume } from "@lit/context";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFVideo } from "../../../elements/EFVideo.js";
import "../../../elements/EFThumbnailStrip.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";
import {
  extractWaveformData,
  type WaveformData,
} from "./waveformUtils.js";
import {
  timelineStateContext,
  type TimelineState,
} from "../timelineStateContext.js";

/** Padding for virtual rendering */
const VIRTUAL_RENDER_PADDING_PX = 100;

@customElement("ef-video-track")
export class EFVideoTrack extends TrackItem {
  static override styles = [
    ...TrackItem.styles,
    css`
      ef-thumbnail-strip {
        height: 100%;
        border: none;
        border-radius: 0;
        background: transparent;
      }
      .audio-overlay {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 8px;
        overflow: hidden;
        pointer-events: none;
      }
      .audio-overlay-canvas {
        position: absolute;
        top: 0;
        height: 100%;
      }
    `,
  ];

  audioCanvasRef = createRef<HTMLCanvasElement>();

  @consume({ context: timelineStateContext, subscribe: true })
  @state()
  private _timelineState?: TimelineState;

  @state()
  private _waveformData: WaveformData | null = null;

  @state()
  private _hasAudio = false;

  #lastSrc: string | null = null;
  #abortController: AbortController | null = null;
  #renderRequested = false;

  /**
   * Check if video has audio and load waveform data
   */
  async #checkAndLoadAudioWaveform(): Promise<void> {
    const video = this.element as EFVideo;
    const src = video?.src;

    if (!src || src === this.#lastSrc) {
      return;
    }

    this.#lastSrc = src;
    this._hasAudio = false;
    this._waveformData = null;

    // Cancel any in-progress load
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    try {
      // Wait for media engine to determine if video has audio
      if (video.mediaEngineTask) {
        const mediaEngine = await video.mediaEngineTask.taskComplete;
        if (mediaEngine?.audioRendition) {
          this._hasAudio = true;

          // Load waveform data
          const waveformData = await extractWaveformData(
            src,
            this.#abortController.signal,
          );

          if (waveformData) {
            this._waveformData = waveformData;
            this.#scheduleRender();
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        // Silently fail - audio overlay is optional
      }
    }
  }

  #scheduleRender(): void {
    if (this.#renderRequested) return;
    this.#renderRequested = true;

    requestAnimationFrame(() => {
      this.#renderRequested = false;
      this.#renderAudioOverlay();
    });
  }

  #renderAudioOverlay(): void {
    const canvas = this.audioCanvasRef.value;
    const waveformData = this._waveformData;

    if (!canvas || !waveformData || !this._hasAudio) return;

    const video = this.element as EFVideo;
    const durationMs = video.durationMs ?? 0;
    if (durationMs === 0) return;

    const pixelsPerMs = this._timelineState?.pixelsPerMs ?? this.pixelsPerMs;
    const trackWidthPx = durationMs * pixelsPerMs;
    const trackStartMs = video.startTimeMs ?? 0;
    const trackStartPx = trackStartMs * pixelsPerMs;

    // Get scroll/viewport info
    const scrollLeft = this._timelineState?.viewportScrollLeft ?? 0;
    const viewportWidth = this._timelineState?.viewportWidth ?? 800;

    // Calculate visible region
    const visibleLeftPx = scrollLeft - VIRTUAL_RENDER_PADDING_PX;
    const visibleRightPx = scrollLeft + viewportWidth + VIRTUAL_RENDER_PADDING_PX;
    const trackEndPx = trackStartPx + trackWidthPx;

    // Check visibility
    if (trackEndPx < visibleLeftPx || trackStartPx > visibleRightPx) {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";

    // Calculate visible portion within track
    const visibleStartInTrack = Math.max(0, visibleLeftPx - trackStartPx);
    const visibleEndInTrack = Math.min(trackWidthPx, visibleRightPx - trackStartPx);
    const visibleWidthPx = visibleEndInTrack - visibleStartInTrack;

    if (visibleWidthPx <= 0) return;

    const height = 8; // Fixed height for subtle overlay
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const targetWidth = Math.ceil(visibleWidthPx * dpr);
    const targetHeight = Math.ceil(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    canvas.style.left = `${visibleStartInTrack}px`;
    canvas.style.width = `${visibleWidthPx}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, visibleWidthPx, height);

    // Calculate time range to render
    const sourceInMs = video.sourceStartMs ?? 0;
    const timeStartMs = sourceInMs + visibleStartInTrack / pixelsPerMs;
    const timeEndMs = sourceInMs + visibleEndInTrack / pixelsPerMs;

    // Draw subtle waveform
    this.#drawSubtleWaveform(ctx, waveformData, visibleWidthPx, height, timeStartMs, timeEndMs);
  }

  #drawSubtleWaveform(
    ctx: CanvasRenderingContext2D,
    waveformData: WaveformData,
    width: number,
    height: number,
    startMs: number,
    endMs: number,
  ): void {
    const { peaks, samplesPerSecond } = waveformData;

    const startSample = Math.floor((startMs / 1000) * samplesPerSecond);
    const endSample = Math.ceil((endMs / 1000) * samplesPerSecond);
    const sampleCount = endSample - startSample;

    if (sampleCount <= 0 || width <= 0) return;

    // Subtle green color for audio indicator
    ctx.fillStyle = "rgba(34, 197, 94, 0.5)";
    ctx.beginPath();

    const pixelsPerSample = width / sampleCount;

    // Draw only the bottom half of the waveform (like a reflection)
    for (let i = 0; i <= sampleCount; i++) {
      const sampleIndex = startSample + i;
      const peakIndex = sampleIndex * 2;
      if (peakIndex + 1 >= peaks.length) break;

      const maxValue = Math.abs(peaks[peakIndex + 1] ?? 0);
      const px = i * pixelsPerSample;
      const py = height - maxValue * height;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    // Close path at bottom
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#checkAndLoadAudioWaveform();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#abortController?.abort();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);

    const video = this.element as EFVideo;
    if (video?.src !== this.#lastSrc) {
      this.#checkAndLoadAudioWaveform();
    }

    if (changedProperties.has("_timelineState") || changedProperties.has("_waveformData")) {
      this.#scheduleRender();
    }

    // Always schedule render after update
    if (this._waveformData) {
      this.#scheduleRender();
    }
  }

  override render() {
    const video = this.element as EFVideo;
    const elementId = (this.element as HTMLElement).id || "";

    // Don't render thumbnail strip until we have a valid EFVideo element
    if (!(video instanceof EFVideo)) {
      return html``;
    }
    const trimStartMs = this.element.trimStartMs ?? 0;
    const trimEndMs = this.element.trimEndMs ?? 0;
    const intrinsicDurationMs =
      this.element.intrinsicDurationMs ?? this.element.durationMs;

    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        style="background-color: var(--filmstrip-bg);"
        ?data-focused=${this.isFocused}
        @mouseenter=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = this.element;
          }
        }}
        @mouseleave=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = null;
          }
        }}
      >
        <div
          ?data-focused=${this.isFocused}
          class="trim-container relative mb-0 block text-nowrap border text-sm"
          style=${styleMap({
            ...this.trimPortionStyles,
            height: "24px",
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: "var(--filmstrip-border)",
          })}
        >
          <ef-thumbnail-strip
            .targetElement=${video}
            .useIntrinsicDuration=${true}
          ></ef-thumbnail-strip>
          ${this._hasAudio && this._waveformData
            ? html`<div class="audio-overlay">
                <canvas ${ref(this.audioCanvasRef)} class="audio-overlay-canvas"></canvas>
              </div>`
            : nothing
          }
          ${
            this.enableTrim
              ? html`<ef-trim-handles
                element-id=${elementId}
                pixels-per-ms=${this.pixelsPerMs}
                trim-start-ms=${trimStartMs}
                trim-end-ms=${trimEndMs}
                intrinsic-duration-ms=${intrinsicDurationMs}
                @trim-change=${this.handleTrimChange}
              ></ef-trim-handles>`
              : nothing
          }
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-video-track": EFVideoTrack;
  }
}
