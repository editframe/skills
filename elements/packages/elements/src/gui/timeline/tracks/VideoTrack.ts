import { consume } from "@lit/context";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFVideo } from "../../../elements/EFVideo.js";
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
import "./EFThumbnailStrip.js";

/** Padding for virtual rendering */
const VIRTUAL_RENDER_PADDING_PX = 100;

/** Height of thumbnail section */
const THUMBNAIL_HEIGHT = 24;
/** Height of audio section when present */
const AUDIO_SECTION_HEIGHT = 14;

@customElement("ef-video-track")
export class EFVideoTrack extends TrackItem {
  static override styles = [
    ...TrackItem.styles,
    css`
      .video-content {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .thumbnail-section {
        position: relative;
        flex: 0 0 ${THUMBNAIL_HEIGHT}px;
        height: ${THUMBNAIL_HEIGHT}px;
        background: rgba(30, 41, 59, 0.6);
      }
      .audio-section {
        position: relative;
        flex: 0 0 ${AUDIO_SECTION_HEIGHT}px;
        height: ${AUDIO_SECTION_HEIGHT}px;
        background: rgba(0, 0, 0, 0.3);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        overflow: hidden;
      }
      .audio-section-canvas {
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

    const height = AUDIO_SECTION_HEIGHT;
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

    // Draw waveform in dedicated section
    this.#drawAudioWaveform(ctx, waveformData, visibleWidthPx, height, timeStartMs, timeEndMs);
  }

  #drawAudioWaveform(
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

    const centerY = height / 2;
    const halfHeight = (height / 2) - 1;
    const pixelsPerSample = width / sampleCount;

    // Draw filled waveform
    ctx.fillStyle = "rgb(74, 222, 128)";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();

    // Draw top half (max values) left to right
    for (let i = 0; i <= sampleCount; i++) {
      const sampleIndex = startSample + i;
      const peakIndex = sampleIndex * 2;
      if (peakIndex + 1 >= peaks.length) break;

      const maxValue = peaks[peakIndex + 1] ?? 0;
      const px = i * pixelsPerSample;
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
      if (peakIndex >= peaks.length) continue;

      const minValue = peaks[peakIndex] ?? 0;
      const px = i * pixelsPerSample;
      const py = centerY - minValue * halfHeight;

      ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fill();

    // Draw center line
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "rgb(74, 222, 128)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    ctx.globalAlpha = 1;
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

  /**
   * Get the total track height based on whether audio is present
   */
  #getTrackHeight(): number {
    if (this._hasAudio && this._waveformData) {
      return THUMBNAIL_HEIGHT + AUDIO_SECTION_HEIGHT;
    }
    return THUMBNAIL_HEIGHT;
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

    const trackHeight = this.#getTrackHeight();
    const hasAudioSection = this._hasAudio && this._waveformData;

    const typeColor = this.getElementTypeColor();
    
    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
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
          class="trim-container"
          style=${styleMap({
            ...this.trimPortionStyles,
            height: `${trackHeight}px`,
            backgroundColor: this.isFocused
              ? "rgba(59, 130, 246, 0.25)"
              : "rgba(30, 41, 59, 0.8)",
            borderLeft: `3px solid ${typeColor}`,
            borderRadius: "3px",
          })}
        >
          <div class="video-content">
            <div class="thumbnail-section">
              <ef-thumbnail-strip
                target=${elementId}
                thumbnail-height=${THUMBNAIL_HEIGHT}
                thumbnail-spacing-px="48"
                pixels-per-ms=${this.pixelsPerMs}
              ></ef-thumbnail-strip>
            </div>
            ${hasAudioSection
              ? html`<div class="audio-section">
                  <canvas ${ref(this.audioCanvasRef)} class="audio-section-canvas"></canvas>
                </div>`
              : nothing
            }
          </div>
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
