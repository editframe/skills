import { provide } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  timelineStateContext,
  type TimelineState,
  DEFAULT_PIXELS_PER_MS,
  pixelsPerMsToZoom,
} from "./timelineStateContext.js";

/**
 * Helper component for providing timeline state context in scenarios.
 * Allows testing timeline components in isolation without the full EFTimeline setup.
 */
@customElement("timeline-state-provider")
export class TimelineStateProvider extends LitElement {
  @provide({ context: timelineStateContext })
  @state()
  private _state: TimelineState = {
    pixelsPerMs: DEFAULT_PIXELS_PER_MS,
    currentTimeMs: 0,
    durationMs: 0,
    viewportScrollLeft: 0,
    viewportWidth: 800,
    seek: (timeMs: number) => {
      this.currentTimeMs = timeMs;
    },
    zoomIn: () => {
      const currentZoom = pixelsPerMsToZoom(this._state.pixelsPerMs);
      this.pixelsPerMs = currentZoom * 1.25 * DEFAULT_PIXELS_PER_MS;
    },
    zoomOut: () => {
      const currentZoom = pixelsPerMsToZoom(this._state.pixelsPerMs);
      this.pixelsPerMs = (currentZoom / 1.25) * DEFAULT_PIXELS_PER_MS;
    },
  };

  @property({ type: Number, attribute: "pixels-per-ms" })
  get pixelsPerMs(): number {
    return this._state.pixelsPerMs;
  }
  set pixelsPerMs(value: number) {
    this._state = {
      ...this._state,
      pixelsPerMs: value,
    };
    this.requestUpdate();
  }

  @property({ type: Number, attribute: "current-time-ms" })
  get currentTimeMs(): number {
    return this._state.currentTimeMs;
  }
  set currentTimeMs(value: number) {
    this._state = {
      ...this._state,
      currentTimeMs: value,
    };
    this.requestUpdate();
  }

  @property({ type: Number, attribute: "duration-ms" })
  get durationMs(): number {
    return this._state.durationMs;
  }
  set durationMs(value: number) {
    this._state = {
      ...this._state,
      durationMs: value,
    };
    this.requestUpdate();
  }

  @property({ type: Number, attribute: "viewport-scroll-left" })
  get viewportScrollLeft(): number {
    return this._state.viewportScrollLeft;
  }
  set viewportScrollLeft(value: number) {
    this._state = {
      ...this._state,
      viewportScrollLeft: value,
    };
    this.requestUpdate();
  }

  @property({ type: Number, attribute: "viewport-width" })
  get viewportWidth(): number {
    return this._state.viewportWidth;
  }
  set viewportWidth(value: number) {
    this._state = {
      ...this._state,
      viewportWidth: value,
    };
    this.requestUpdate();
  }

  /**
   * Get the current timeline state (for external access)
   */
  get state(): TimelineState {
    return this._state;
  }

  /**
   * Update multiple state properties at once
   */
  updateState(updates: Partial<TimelineState>): void {
    this._state = {
      ...this._state,
      ...updates,
    };
    this.requestUpdate();
  }

  render() {
    // This component provides context to its children and renders them
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "timeline-state-provider": TimelineStateProvider;
  }
}
