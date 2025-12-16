import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import {
  customElement,
  eventOptions,
  property,
  state,
} from "lit/decorators.js";

import { createRef, ref } from "lit/directives/ref.js";
import type { ControllableInterface } from "./Controllable.js";
import { currentTimeContext } from "./currentTimeContext.js";
import { durationContext } from "./durationContext.js";
import { efContext } from "./efContext.js";
import { playingContext } from "./playingContext.js";
import { TargetOrContextMixin } from "./TargetOrContextMixin.js";
import { quantizeToFrameTimeMs } from "./EFTimelineRuler.js";

const BASE_PIXELS_PER_SECOND = 100;

function timeToPixels(
  timeMs: number,
  durationMs: number,
  containerWidth: number,
  zoomScale: number,
): number {
  if (durationMs <= 0) return 0;
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;
  return (timeMs / 1000) * pixelsPerSecond;
}

function pixelsToTime(
  pixels: number,
  durationMs: number,
  containerWidth: number,
  zoomScale: number,
): number {
  if (durationMs <= 0) return 0;
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;
  return (pixels / pixelsPerSecond) * 1000;
}

@customElement("ef-scrubber")
export class EFScrubber extends TargetOrContextMixin(LitElement, efContext) {
  static styles = [
    css`
    :host {
      --ef-scrubber-height: 4px;
      --ef-scrubber-background: rgb(209 213 219);
      --ef-scrubber-progress-color: rgb(37 99 235);
      --ef-scrubber-handle-size: 12px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    :host(.dark), :host-context(.dark) {
      --ef-scrubber-background: rgb(75 85 99);
      --ef-scrubber-progress-color: rgb(96 165 250);
    }
    
    :host([orientation="vertical"]) {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
      pointer-events: auto;
    }

    .scrubber {
      width: 100%;
      height: var(--ef-scrubber-height);
      background: var(--ef-scrubber-background);
      position: relative;
      cursor: pointer;
      border-radius: 2px;
      touch-action: none;
      user-select: none;
    }

    :host([orientation="vertical"]) .scrubber {
      width: 100%;
      height: 100%;
      background: transparent;
      cursor: ew-resize;
    }

    .progress {
      position: absolute;
      height: 100%;
      background: var(--ef-scrubber-progress-color);
      border-radius: 2px;
    }

    :host([orientation="vertical"]) .progress {
      display: none;
    }

    .handle {
      position: absolute;
      width: var(--ef-scrubber-handle-size);
      height: var(--ef-scrubber-handle-size);
      background: var(--ef-scrubber-progress-color);
      border-radius: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
    }

    :host([orientation="vertical"]) .handle {
      display: none;
    }

    .playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--ef-scrubber-progress-color);
      pointer-events: auto;
      cursor: ew-resize;
      z-index: 30;
    }

    ::part(playhead) {
      z-index: 30;
    }

    .playhead-handle {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: var(--ef-scrubber-progress-color);
      border-radius: 50%;
    }

    .raw-preview {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: rgba(37, 99, 235, 0.2);
      pointer-events: none;
      z-index: 20;
    }

    /* Add CSS Shadow Parts */
    ::part(scrubber) { }
    ::part(progress) { }
    ::part(handle) { }
    `,
  ];

  @consume({ context: playingContext, subscribe: true })
  playing = false;

  @consume({ context: currentTimeContext, subscribe: true })
  contextCurrentTimeMs = Number.NaN;

  @consume({ context: durationContext, subscribe: true })
  contextDurationMs = 0;

  @property({ type: String, attribute: "orientation" })
  orientation: "horizontal" | "vertical" = "horizontal";

  @property({ type: Number, attribute: "current-time-ms" })
  currentTimeMs = Number.NaN;

  @property({ type: Number, attribute: "duration-ms" })
  durationMs = 0;

  @property({ type: Number, attribute: "zoom-scale" })
  zoomScale = 1.0;

  @property({ type: Number, attribute: "container-width" })
  containerWidth = 0;

  @property({ type: Number, attribute: "fps" })
  fps?: number;

  @property({ type: Number, attribute: "raw-scrub-time-ms" })
  rawScrubTimeMs?: number | null;

  @property({ attribute: false })
  scrollContainerRef?: { current: HTMLElement | null };

  /**
   * Reference to the element that represents the actual track content area.
   * Used to calculate the offset between the scroll container and where tracks begin.
   */
  @property({ attribute: false })
  trackContentRef?: { current: HTMLElement | null };

  @property({ attribute: false })
  onSeek?: (time: number) => void;

  @property({ attribute: false })
  isScrubbingRef?: { current: boolean };

  get context(): ControllableInterface | null {
    return this.effectiveContext;
  }

  get effectiveCurrentTimeMs(): number {
    return this.currentTimeMs ?? this.contextCurrentTimeMs ?? 0;
  }

  get effectiveDurationMs(): number {
    return this.durationMs || this.contextDurationMs || 0;
  }

  get isTimelineMode(): boolean {
    return this.orientation === "vertical" && this.zoomScale > 0;
  }

  @state()
  private scrubProgress = 0;

  @state()
  private isMoving = false;

  private scrubberRef = createRef<HTMLElement>();
  private _scrubberElement?: HTMLElement;
  private capturedPointerId: number | null = null;

  private updateProgress(e: PointerEvent) {
    const scrubberEl = this.scrubberRef.value || this._scrubberElement;
    if (!scrubberEl) return;

    const duration = this.effectiveDurationMs;
    if (duration <= 0) return;

    if (this.isTimelineMode) {
      // Timeline mode: use pixel-based positioning with zoom
      const scrollContainer =
        this.scrollContainerRef?.current || scrubberEl.parentElement;
      if (!scrollContainer) return;

      const scrollContainerRect = scrollContainer.getBoundingClientRect();
      const scrollLeft = scrollContainer.scrollLeft || 0;

      // Calculate pixel offset dynamically from the track content element
      // This accounts for any hierarchy panel or other elements before the tracks
      let pixelOffset = 0;
      if (this.trackContentRef?.current) {
        const trackRect = this.trackContentRef.current.getBoundingClientRect();
        pixelOffset =
          trackRect.left -
          scrollContainerRect.left +
          scrollContainer.scrollLeft;
      }

      const x = e.clientX - scrollContainerRect.left - pixelOffset;
      const pixelPosition = scrollLeft + x;
      const effectiveWidth =
        this.containerWidth > 0
          ? this.containerWidth
          : scrollContainerRect.width;
      if (effectiveWidth <= 0) return;

      let rawTime = pixelsToTime(
        pixelPosition,
        duration,
        effectiveWidth,
        this.zoomScale,
      );
      rawTime = Math.max(0, Math.min(rawTime, duration));

      // Quantize to frame boundaries if FPS is provided, then clamp to duration
      let quantizedTime =
        this.fps && this.fps > 0
          ? quantizeToFrameTimeMs(rawTime, this.fps)
          : rawTime;
      quantizedTime = Math.max(0, Math.min(quantizedTime, duration));

      this.scrubProgress = quantizedTime / duration;

      if (this.onSeek) {
        this.onSeek(quantizedTime);
      } else {
        // Emit seek event for event listeners
        this.dispatchEvent(
          new CustomEvent("seek", {
            detail: quantizedTime,
            bubbles: true,
            composed: true,
          }),
        );
        if (this.context) {
          this.context.currentTimeMs = quantizedTime;
        }
      }
    } else {
      // Horizontal mode: simple progress calculation
      const rect = scrubberEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));

      this.scrubProgress = progress;
      const timeMs = progress * duration;

      if (this.onSeek) {
        this.onSeek(timeMs);
      } else {
        // Emit seek event for event listeners
        this.dispatchEvent(
          new CustomEvent("seek", {
            detail: timeMs,
            bubbles: true,
            composed: true,
          }),
        );
        if (this.context) {
          this.context.currentTimeMs = timeMs;
        }
      }
    }
  }

  @eventOptions({ passive: false, capture: false })
  private handlePointerDown(e: PointerEvent) {
    const scrubberEl = this.scrubberRef.value || this._scrubberElement;
    if (!scrubberEl) return;

    this.isMoving = true;
    if (this.isScrubbingRef) {
      this.isScrubbingRef.current = true;
    }
    e.preventDefault();
    e.stopPropagation();
    this.capturedPointerId = e.pointerId;
    try {
      scrubberEl.setPointerCapture(e.pointerId);
    } catch (err) {
      // setPointerCapture may fail in some cases, continue anyway
      console.warn("Failed to set pointer capture:", err);
    }
    this.updateProgress(e);
  }

  private boundHandlePointerMove = (e: PointerEvent) => {
    if (this.isMoving && e.pointerId === this.capturedPointerId) {
      e.preventDefault();
      e.stopPropagation();
      this.updateProgress(e);
    }
  };

  private boundHandlePointerUp = (e: PointerEvent) => {
    const scrubberEl = this.scrubberRef.value || this._scrubberElement;
    if (e.pointerId === this.capturedPointerId && scrubberEl) {
      e.preventDefault();
      e.stopPropagation();
      try {
        scrubberEl.releasePointerCapture(e.pointerId);
      } catch (_err) {
        // releasePointerCapture may fail if capture was already lost
      }
      this.capturedPointerId = null;
      this.isMoving = false;
      if (this.isScrubbingRef) {
        this.isScrubbingRef.current = false;
      }
    }
  };

  private boundHandlePointerCancel = (e: PointerEvent) => {
    const scrubberEl = this.scrubberRef.value || this._scrubberElement;
    if (e.pointerId === this.capturedPointerId && scrubberEl) {
      try {
        scrubberEl.releasePointerCapture(e.pointerId);
      } catch (_err) {
        // releasePointerCapture may fail if capture was already lost
      }
      this.capturedPointerId = null;
      this.isMoving = false;
      if (this.isScrubbingRef) {
        this.isScrubbingRef.current = false;
      }
    }
  };

  private boundHandleContextMenu = (e: Event) => {
    if (this.isMoving) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  render() {
    const duration = this.effectiveDurationMs;
    const currentTime = this.effectiveCurrentTimeMs;

    if (duration <= 0) {
      return html``;
    }

    if (this.isTimelineMode) {
      // Vertical timeline mode: render playhead line
      const scrubberEl = this.scrubberRef.value || this._scrubberElement;
      const effectiveWidth =
        this.containerWidth > 0
          ? this.containerWidth
          : scrubberEl?.parentElement?.getBoundingClientRect().width || 0;

      const positionPixels =
        effectiveWidth > 0
          ? timeToPixels(currentTime, duration, effectiveWidth, this.zoomScale)
          : 0;

      const rawScrubPositionPixels =
        this.rawScrubTimeMs !== null &&
        this.rawScrubTimeMs !== undefined &&
        effectiveWidth > 0
          ? timeToPixels(
              this.rawScrubTimeMs,
              duration,
              effectiveWidth,
              this.zoomScale,
            )
          : null;

      return html`
        ${
          rawScrubPositionPixels !== null &&
          rawScrubPositionPixels !== positionPixels
            ? html`<div
              class="raw-preview"
              style="left: ${rawScrubPositionPixels}px"
            ></div>`
            : html``
        }
        <div
          ${ref(this.scrubberRef)}
          part="scrubber"
          class="scrubber"
          @pointerdown=${this.handlePointerDown}
          @contextmenu=${this.boundHandleContextMenu}
        >
          <div
            part="playhead"
            class="playhead"
            style="left: ${positionPixels}px"
            @pointerdown=${this.handlePointerDown}
          >
            <div class="playhead-handle"></div>
          </div>
        </div>
      `;
    } else {
      // Horizontal mode: render progress bar
      const currentProgress = duration > 0 ? currentTime / duration : 0;
      const displayProgress = this.isMoving
        ? this.scrubProgress
        : currentProgress;

      return html`
        <div
          ${ref(this.scrubberRef)}
          part="scrubber"
          class="scrubber"
          @pointerdown=${this.handlePointerDown}
          @contextmenu=${this.boundHandleContextMenu}
        >
          <div class="progress" style="width: ${displayProgress * 100}%"></div>
          <div class="handle" style="left: ${displayProgress * 100}%"></div>
        </div>
      `;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      "pointerup",
      this.boundHandlePointerUp as EventListener,
      { passive: false },
    );
    window.addEventListener("pointermove", this.boundHandlePointerMove, {
      passive: false,
    });
    window.addEventListener(
      "pointercancel",
      this.boundHandlePointerCancel as EventListener,
      { passive: false },
    );
    this.addEventListener("contextmenu", this.boundHandleContextMenu, {
      passive: false,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "pointerup",
      this.boundHandlePointerUp as EventListener,
    );
    window.removeEventListener("pointermove", this.boundHandlePointerMove);
    window.removeEventListener(
      "pointercancel",
      this.boundHandlePointerCancel as EventListener,
    );
    this.removeEventListener("contextmenu", this.boundHandleContextMenu);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-scrubber": EFScrubber;
  }
}
