import { consume } from "@lit/context";
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValueMap,
  type ReactiveController,
  type TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../../../elements/EFTemporal.js";
import { EFTimegroup } from "../../../elements/EFTimegroup.js";
import { EFVideo } from "../../../elements/EFVideo.js";
import { EFAudio } from "../../../elements/EFAudio.js";
import { EFImage } from "../../../elements/EFImage.js";
import { EFText } from "../../../elements/EFText.js";
import { type FocusContext, focusContext } from "../../focusContext.js";
import { focusedElementContext } from "../../focusedElementContext.js";
import { TWMixin } from "../../TWMixin.js";
import { phosphorIcon, ICONS } from "../../icons.js";
import "../TrimHandles.js";
import type { TrimChangeDetail } from "../TrimHandles.js";

class ElementTrackController implements ReactiveController {
  private lastDuration = 0;
  private durationCheckFrame?: number;

  constructor(
    private host: LitElement,
    private track: TrackItem,
  ) {
    this.host.addController(this);
  }

  remove() {
    this.host.removeController(this);
    if (this.durationCheckFrame) {
      cancelAnimationFrame(this.durationCheckFrame);
    }
  }

  hostDisconnected() {
    this.host.removeController(this);
    if (this.durationCheckFrame) {
      cancelAnimationFrame(this.durationCheckFrame);
    }
  }

  hostConnected(): void {
    // Start watching for duration changes
    this.lastDuration = (this.host as any).durationMs ?? 0;
    this.checkDuration();
  }

  private checkDuration = () => {
    const currentDuration = (this.host as any).durationMs ?? 0;
    if (currentDuration !== this.lastDuration) {
      this.lastDuration = currentDuration;
      // Duration changed - trigger re-render of the track
      this.track.requestUpdate();
    }
    // Keep checking if duration is still 0 (waiting for media to load)
    if (currentDuration === 0) {
      this.durationCheckFrame = requestAnimationFrame(this.checkDuration);
    }
  };

  hostUpdated(): void {
    // TEMPORARILY DISABLED: This causes every TrackItem to re-render on every frame
    // during playback, even though TrackItem doesn't display currentTimeMs.
    // Duration changes are now handled separately via checkDuration()
  }
}

const CommonEffectKeys = new Set([
  "offset",
  "easing",
  "composite",
  "computedOffset",
]);

@customElement("ef-track-item")
export class TrackItem extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
      }
      .trim-container {
        position: relative;
        border-radius: 3px;
        transition: background-color 0.15s ease, box-shadow 0.15s ease;
      }
      
      :host(:hover) .trim-container {
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
      }
      
      :host([data-focused]) .trim-container {
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.6);
      }
    `,
  ];

  @consume({ context: focusContext, subscribe: true })
  focusContext?: FocusContext;

  @consume({ context: focusedElementContext, subscribe: true })
  focusedElement?: HTMLElement | null;

  get isFocused() {
    return this.element && this.focusContext?.focusedElement === this.element;
  }

  /**
   * Get element type for styling and icons
   */
  protected getElementType(): "video" | "audio" | "image" | "text" | "timegroup" | "captions" | "unknown" {
    // Check for captions element
    if ((this.element as any).tagName === "EF-CAPTIONS" || 
        (this.element as any).tagName?.toLowerCase() === "ef-captions") {
      return "captions";
    }
    if (this.element instanceof EFVideo) return "video";
    if (this.element instanceof EFAudio) return "audio";
    if (this.element instanceof EFImage) return "image";
    if (this.element instanceof EFText) return "text";
    if (this.element instanceof EFTimegroup) return "timegroup";
    return "unknown";
  }

  /**
   * Get color for element type
   */
  protected getElementTypeColor(): string {
    const type = this.getElementType();
    switch (type) {
      case "video":
        return "rgb(59, 130, 246)"; // Blue
      case "audio":
        return "rgb(34, 197, 94)"; // Green
      case "image":
        return "rgb(168, 85, 247)"; // Purple
      case "text":
        return "rgb(249, 115, 22)"; // Orange
      case "captions":
        return "rgb(34, 197, 94)"; // Green (same as audio, but distinct usage)
      case "timegroup":
        return "rgb(148, 163, 184)"; // Gray
      default:
        return "rgb(148, 163, 184)"; // Gray
    }
  }

  /**
   * Get icon for element type
   */
  protected getElementIcon(): TemplateResult | typeof nothing {
    const type = this.getElementType();
    switch (type) {
      case "video":
        return phosphorIcon(ICONS.filmStrip, 14);
      case "audio":
        return phosphorIcon(ICONS.speakerHigh, 14);
      case "image":
        return phosphorIcon(ICONS.image, 14);
      case "text":
        return phosphorIcon(ICONS.textT, 14);
      case "captions":
        return phosphorIcon(ICONS.subtitles, 14);
      case "timegroup":
        return phosphorIcon(ICONS.filmSlate, 14);
      default:
        return nothing;
    }
  }

  /**
   * Format duration for display
   */
  protected formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  }

  /**
   * Get tooltip text with element info
   */
  protected getTooltipText(): string {
    const elementId = (this.element as HTMLElement)?.id || "";
    const type = this.getElementType();
    const duration = this.formatDuration(this.element.durationMs ?? 0);
    const startTime = this.formatDuration(this.element.startTimeMs ?? 0);
    const endTime = this.formatDuration((this.element.startTimeMs ?? 0) + (this.element.durationMs ?? 0));
    
    const parts = [];
    if (elementId) parts.push(elementId);
    parts.push(`${type} • ${duration}`);
    if (this.element.startTimeMs > 0) {
      parts.push(`${startTime} → ${endTime}`);
    }
    
    // Add composition mode for timegroups
    if (type === "timegroup") {
      const mode = (this.element as any).mode || "fixed";
      parts.push(`mode: ${mode}`);
    }
    
    return parts.join(" • ");
  }

  @property({ type: Object, attribute: false })
  element: TemporalMixinInterface & LitElement = new EFTimegroup();

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.04;

  @property({ type: Boolean, attribute: "enable-trim" })
  enableTrim = false;

  @property({ type: Array, attribute: false })
  hideSelectors?: string[];

  @property({ type: Array, attribute: false })
  showSelectors?: string[];

  /**
   * When true, positions the track at the element's absolute start time
   * (startTimeMs) rather than relative to parent (startTimeWithinParentMs).
   * Used for flat row architectures where each element gets its own row.
   */
  @property({ type: Boolean, attribute: "use-absolute-position" })
  useAbsolutePosition = false;

  get gutterStyles() {
    const startMs = this.useAbsolutePosition
      ? this.element.startTimeMs
      : this.element.startTimeWithinParentMs;
    // When using absolute positioning, don't subtract sourceStartMs - the track container
    // should be positioned at the element's absolute start time in the timeline.
    // When using relative positioning, sourceStartMs is already accounted for in startTimeWithinParentMs.
    const leftOffset = this.useAbsolutePosition
      ? startMs
      : startMs - this.element.sourceStartMs;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * leftOffset}px`,
      width: `${this.pixelsPerMs * (this.element.intrinsicDurationMs ?? this.element.durationMs)}px`,
    };
  }

  get trimPortionStyles() {
    // When using absolute positioning, the trim container should start at 0
    // relative to the gutter (which is already positioned at startTimeMs).
    // When using relative positioning, we need to offset by sourceStartMs
    // to show the trimmed portion correctly.
    const leftOffset = this.useAbsolutePosition
      ? 0
      : this.element.sourceStartMs;
    return {
      width: `${this.pixelsPerMs * this.element.durationMs}px`,
      left: `${this.pixelsPerMs * leftOffset}px`,
    };
  }

  protected handleTrimChange(e: CustomEvent<TrimChangeDetail>): void {
    const { type, newValueMs } = e.detail;

    if (type === "start") {
      this.element.trimStartMs = newValueMs;
    } else {
      this.element.trimEndMs = newValueMs;
    }

    this.dispatchEvent(
      new CustomEvent("track-trim-change", {
        detail: {
          elementId: this.element.id || "",
          type,
          newValueMs,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  contents(): TemplateResult | typeof nothing {
    return nothing;
  }

  animations() {
    // TEMPORARILY DISABLED: getAnimations() is expensive and called on every render
    // TODO: Cache animations or only compute when element structure changes
    return [];
    
    // const animations = this.element.getAnimations();
    // return animations.map((animation) => {
    //   const effect = animation.effect;
    //   if (!(effect instanceof KeyframeEffect)) {
    //     return nothing;
    //   }
    //   const start = effect.getTiming().delay ?? 0;
    //   const duration = effect.getTiming().duration;
    //   if (duration === null) {
    //     return nothing;
    //   }
    //   const keyframes = effect.getKeyframes();
    //   const firstKeyframe = keyframes[0];
    //   if (!firstKeyframe) {
    //     return nothing;
    //   }
    //   const properties = new Set(Object.keys(firstKeyframe));
    //   for (const key of CommonEffectKeys) {
    //     properties.delete(key);
    //   }

    //   return html`<div
    //     class="relative h-[5px] opacity-50"
    //     label="animation"
    //     style=${styleMap({
    //       left: `${this.pixelsPerMs * start}px`,
    //       width: `${this.pixelsPerMs * Number(duration)}px`,
    //       backgroundColor: "var(--filmstrip-animation-bg)",
    //     })}
    //   >
    //     ${effect.getKeyframes().map((keyframe) => {
    //       return html`<div
    //         class="absolute top-0 h-full w-1"
    //         style=${styleMap({
    //           left: `${
    //             this.pixelsPerMs * keyframe.computedOffset * Number(duration)
    //           }px`,
    //           backgroundColor: "var(--filmstrip-keyframe-bg)",
    //         })}
    //       ></div>`;
    //     })}
    //   </div>`;
    // });
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    return nothing;
  }

  render() {
    const elementId = (this.element as HTMLElement).id || "";
    const trimStartMs = this.element.trimStartMs ?? 0;
    const trimEndMs = this.element.trimEndMs ?? 0;
    const intrinsicDurationMs =
      this.element.intrinsicDurationMs ?? this.element.durationMs;

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
            height: "var(--timeline-track-height, 22px)",
            backgroundColor: this.isFocused
              ? "rgba(59, 130, 246, 0.25)"
              : "rgba(30, 41, 59, 0.8)",
            borderLeft: `3px solid ${typeColor}`,
          })}
          title="${this.getTooltipText()}"
        >
          ${this.animations()}
          ${this.contents()}
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

  protected trackController?: ElementTrackController;

  update(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (
      changedProperties.has("element") &&
      this.element instanceof LitElement
    ) {
      this.trackController?.remove();
      this.trackController = new ElementTrackController(
        this.element,
        this,
      );
    }
    super.update(changedProperties);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-track-item": TrackItem;
  }
}

