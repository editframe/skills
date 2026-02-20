import { consume } from "@lit/context";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { EFAudio } from "../../../elements/EFAudio.js";
import { TrackItem } from "./TrackItem.js";
import { extractWaveformData, type WaveformData } from "./waveformUtils.js";
import {
  timelineStateContext,
  type TimelineState,
} from "../timelineStateContext.js";

/** Padding in pixels to render beyond visible area (for smooth scrolling) */
const VIRTUAL_RENDER_PADDING_PX = 100;

@customElement("ef-audio-track")
export class EFAudioTrack extends TrackItem {
  static styles = [
    ...TrackItem.styles,
    css`
      .waveform-host {
        position: absolute;
        left: 0;
        top: 2px;
        right: 0;
        bottom: 2px;
        overflow: hidden;
      }
      .waveform-canvas {
        display: block;
        position: absolute;
        top: 0;
        height: 100%;
        pointer-events: none;
      }
    `,
  ];

  canvasRef = createRef<HTMLCanvasElement>();

  /** Timeline state context for viewport info */
  @consume({ context: timelineStateContext, subscribe: true })
  @state()
  private _timelineState?: TimelineState;

  @state()
  private _waveformData: WaveformData | null = null;

  @state()
  private _isLoading = false;

  #lastSrc: string | null = null;
  #abortController: AbortController | null = null;
  #resizeObserver?: ResizeObserver;
  #renderRequested = false;
  #hostHeight = 0;

  /**
   * Load waveform data when the audio source changes
   */
  async #loadWaveformData(): Promise<void> {
    const audio = this.element as EFAudio;
    const src = audio?.src;

    // Skip if no source or same source already loaded
    if (!src || src === this.#lastSrc) {
      return;
    }

    this.#lastSrc = src;

    // Cancel any in-progress load
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    this._isLoading = true;

    try {
      const waveformData = await extractWaveformData(
        audio,
        this.#abortController.signal,
      );

      if (waveformData) {
        this._waveformData = waveformData;
        this.#scheduleRender();
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.warn("Failed to load waveform data:", error);
      }
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * Schedule a canvas render on the next animation frame
   */
  #scheduleRender(): void {
    if (this.#renderRequested) return;
    this.#renderRequested = true;

    requestAnimationFrame(() => {
      this.#renderRequested = false;
      this.#renderWaveform();
    });
  }

  /**
   * Get the track's position info relative to timeline scroll
   */
  #getTrackPositionInfo(): {
    trackStartPx: number;
    trackWidthPx: number;
    viewportScrollLeft: number;
    viewportWidth: number;
    pixelsPerMs: number;
  } | null {
    const audio = this.element as EFAudio;
    const durationMs = audio.durationMs ?? 0;
    if (durationMs === 0) return null;

    const pixelsPerMs = this._timelineState?.pixelsPerMs ?? this.pixelsPerMs;
    const trackWidthPx = durationMs * pixelsPerMs;

    // Get track's absolute position from startTimeMs
    const trackStartMs = audio.startTimeMs ?? 0;
    const trackStartPx = trackStartMs * pixelsPerMs;

    // Get viewport info from context
    const viewportScrollLeft = this._timelineState?.viewportScrollLeft ?? 0;
    const viewportWidth = this._timelineState?.viewportWidth ?? 800;

    return {
      trackStartPx,
      trackWidthPx,
      viewportScrollLeft,
      viewportWidth,
      pixelsPerMs,
    };
  }

  /**
   * Render the waveform to canvas with virtual rendering.
   *
   * The approach:
   * 1. Calculate the visible portion of the track (intersection of track and viewport)
   * 2. Position the canvas at that visible portion within the track
   * 3. Draw only the waveform data for that visible time range
   * 4. Update position and content as scroll/zoom changes
   */
  #renderWaveform(): void {
    const canvas = this.canvasRef.value;
    const waveformData = this._waveformData;

    if (!canvas || !waveformData) return;

    const positionInfo = this.#getTrackPositionInfo();
    if (!positionInfo) return;

    const {
      trackStartPx,
      trackWidthPx,
      viewportScrollLeft,
      viewportWidth,
      pixelsPerMs,
    } = positionInfo;

    // Calculate visible region in absolute pixels (with padding for smooth scrolling)
    const visibleLeftPx = viewportScrollLeft - VIRTUAL_RENDER_PADDING_PX;
    const visibleRightPx =
      viewportScrollLeft + viewportWidth + VIRTUAL_RENDER_PADDING_PX;

    // Track boundaries in absolute pixels
    const trackEndPx = trackStartPx + trackWidthPx;

    // Check if track is visible at all
    if (trackEndPx < visibleLeftPx || trackStartPx > visibleRightPx) {
      // Track not visible, hide canvas
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";

    // Calculate the intersection: what part of the track is visible
    // All coordinates are now relative to the track's left edge (0 = track start)
    const visibleStartInTrack = Math.max(0, visibleLeftPx - trackStartPx);
    const visibleEndInTrack = Math.min(
      trackWidthPx,
      visibleRightPx - trackStartPx,
    );
    const visibleWidthPx = visibleEndInTrack - visibleStartInTrack;

    if (visibleWidthPx <= 0) return;

    const height = this.#hostHeight || 18;

    // Set canvas size with DPR
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.ceil(visibleWidthPx * dpr);
    const targetHeight = Math.ceil(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    // Position canvas at the visible portion within the track
    canvas.style.left = `${visibleStartInTrack}px`;
    canvas.style.width = `${visibleWidthPx}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, visibleWidthPx, height);

    // Calculate what time range to render
    const audio = this.element as EFAudio;
    const sourceInMs = audio.sourceStartMs ?? 0;

    // Convert visible pixel range to time range
    const timeStartMs = sourceInMs + visibleStartInTrack / pixelsPerMs;
    const timeEndMs = sourceInMs + visibleEndInTrack / pixelsPerMs;

    // Draw the waveform for the visible portion
    this.#drawWaveformRegion(
      ctx,
      waveformData,
      0, // Start drawing at x=0 of canvas (canvas is already positioned)
      visibleWidthPx,
      height,
      timeStartMs,
      timeEndMs,
    );
  }

  /**
   * Draw a region of the waveform to canvas
   */
  #drawWaveformRegion(
    ctx: CanvasRenderingContext2D,
    waveformData: WaveformData,
    x: number,
    width: number,
    height: number,
    startMs: number,
    endMs: number,
  ): void {
    const { peaks, samplesPerSecond } = waveformData;

    // Calculate sample range
    const startSample = Math.floor((startMs / 1000) * samplesPerSecond);
    const endSample = Math.ceil((endMs / 1000) * samplesPerSecond);
    const sampleCount = endSample - startSample;

    if (sampleCount <= 0 || width <= 0) return;

    const centerY = height / 2;
    const halfHeight = height / 2 - 2; // Leave 2px padding top/bottom
    const color = this.getElementTypeColor();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();

    // Draw top half (max values) left to right
    const pixelsPerSample = width / sampleCount;

    for (let i = 0; i <= sampleCount; i++) {
      const sampleIndex = startSample + i;
      const peakIndex = sampleIndex * 2;

      // Clamp to valid range
      if (peakIndex + 1 >= peaks.length) break;

      const maxValue = peaks[peakIndex + 1] ?? 0;
      const px = x + i * pixelsPerSample;
      const py = centerY - maxValue * halfHeight;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    // Draw bottom half (min values) right to left
    for (let i = sampleCount; i >= 0; i--) {
      const sampleIndex = startSample + i;
      const peakIndex = sampleIndex * 2;

      // Clamp to valid range
      if (peakIndex >= peaks.length) continue;

      const minValue = peaks[peakIndex] ?? 0;
      const px = x + i * pixelsPerSample;
      const py = centerY - minValue * halfHeight;

      ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fill();

    // Draw center line
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + width, centerY);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  connectedCallback(): void {
    super.connectedCallback();

    // Start loading waveform data
    this.#loadWaveformData();

    // Observe size changes
    this.#resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.#hostHeight =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        this.#scheduleRender();
      }
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#abortController?.abort();
    this.#resizeObserver?.disconnect();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);

    // Check if we need to reload waveform data
    const audio = this.element as EFAudio;
    if (audio?.src !== this.#lastSrc) {
      this.#loadWaveformData();
    }

    // Re-render when timeline state changes (scroll, zoom)
    if (changedProperties.has("_timelineState")) {
      this.#scheduleRender();
    }

    // Attach resize observer to track container once rendered
    if (this.canvasRef.value && this.#resizeObserver) {
      const container = this.canvasRef.value.parentElement;
      if (container) {
        this.#resizeObserver.disconnect();
        this.#resizeObserver.observe(container);
      }
    }

    // Always schedule render after update to catch any changes
    this.#scheduleRender();
  }

  contents() {
    const audio = this.element as EFAudio;
    if (!(audio instanceof EFAudio)) {
      return nothing;
    }

    const durationMs = audio.durationMs ?? 0;
    if (durationMs === 0) {
      return nothing;
    }

    // Show loading placeholder if no waveform data yet
    if (!this._waveformData) {
      return this.#renderPlaceholder();
    }

    // The host fills the track container, canvas is positioned within it
    return html`
      <div class="waveform-host">
        <canvas ${ref(this.canvasRef)} class="waveform-canvas"></canvas>
      </div>
    `;
  }

  /**
   * Render placeholder while loading
   */
  #renderPlaceholder() {
    return html`
      <div
        style="
          position: absolute;
          left: 0;
          top: 2px;
          bottom: 2px;
          right: 0;
          background: linear-gradient(90deg, 
            ${this.getElementTypeColor()}22 0%, 
            ${this.getElementTypeColor()}44 50%,
            ${this.getElementTypeColor()}22 100%
          );
          background-size: 200% 100%;
          animation: ${this._isLoading ? "shimmer 1.5s infinite" : "none"};
          border-radius: 2px;
        "
      ></div>
      <style>
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    `;
  }
}
