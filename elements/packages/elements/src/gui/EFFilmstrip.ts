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
import {
  customElement,
  eventOptions,
  property,
  state,
} from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";

import { EFAudio } from "../elements/EFAudio.js";
import {
  type Caption,
  EFCaptions,
  EFCaptionsActiveWord,
} from "../elements/EFCaptions.js";
import { EFImage } from "../elements/EFImage.js";
import { EFText } from "../elements/EFText.js";
import { EFTextSegment } from "../elements/EFTextSegment.js";
import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../elements/EFTemporal.js";
import { EFTimegroup } from "../elements/EFTimegroup.js";
import { EFVideo } from "../elements/EFVideo.js";
import { EFWaveform } from "../elements/EFWaveform.js";
import { TargetController } from "../elements/TargetController.js";
import "../elements/EFThumbnailStrip.js";
import { TimegroupController } from "../elements/TimegroupController.js";
import { targetTemporalContext } from "./ContextMixin.ts";
import type { EFPreview } from "./EFPreview.js";
import type { EFWorkbench } from "./EFWorkbench.js";
import { type FocusContext, focusContext } from "./focusContext.js";
import { focusedElementContext } from "./focusedElementContext.js";
import { TWMixin } from "./TWMixin.js";
import {
  renderHierarchyChildren,
  shouldRenderElement,
} from "./hierarchy/EFHierarchyItem.js";
import "./timeline/TrimHandles.js";
import type { TrimChangeDetail } from "./timeline/TrimHandles.js";

class ElementFilmstripController implements ReactiveController {
  constructor(
    private host: LitElement,
    private filmstrip: FilmstripItem,
  ) {
    this.host.addController(this);
  }

  remove() {
    this.host.removeController(this);
  }

  hostDisconnected() {
    this.host.removeController(this);
  }

  hostUpdated(): void {
    this.filmstrip.requestUpdate();
  }
}

const CommonEffectKeys = new Set([
  "offset",
  "easing",
  "composite",
  "computedOffset",
]);

class FilmstripItem extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
      }
      .trim-container {
        position: relative;
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

  @property({ type: Object, attribute: false })
  element: TemporalMixinInterface & LitElement = new EFTimegroup();

  @property({ type: Number })
  pixelsPerMs = 0.04;

  @property({ type: Boolean, attribute: "enable-trim" })
  enableTrim = false;

  get gutterStyles() {
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (this.element.startTimeWithinParentMs - this.element.sourceStartMs)}px`,
      width: `${this.pixelsPerMs * (this.element.intrinsicDurationMs ?? this.element.durationMs)}px`,
    };
  }

  get trimPortionStyles() {
    return {
      width: `${this.pixelsPerMs * this.element.durationMs}px`,
      left: `${this.pixelsPerMs * this.element.sourceStartMs}px`,
    };
  }

  private handleTrimChange(e: CustomEvent<TrimChangeDetail>): void {
    const { type, newValueMs } = e.detail;
    
    if (type === "start") {
      this.element.trimStartMs = newValueMs;
    } else {
      this.element.trimEndMs = newValueMs;
    }
    
    this.dispatchEvent(
      new CustomEvent("filmstrip-trim-change", {
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

  render() {
    const elementId = (this.element as HTMLElement).id || "";
    const trimStartMs = this.element.trimStartMs ?? 0;
    const trimEndMs = this.element.trimEndMs ?? 0;
    const intrinsicDurationMs = this.element.intrinsicDurationMs ?? this.element.durationMs;

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
          class="trim-container border-outset relative mb-[1px] block h-[1.1rem] text-nowrap border text-sm"
          style=${styleMap({
            ...this.trimPortionStyles,
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: "var(--filmstrip-border)",
          })}
        >
          ${this.animations()}
          ${this.enableTrim
            ? html`<ef-trim-handles
                element-id=${elementId}
                pixels-per-ms=${this.pixelsPerMs}
                trim-start-ms=${trimStartMs}
                trim-end-ms=${trimEndMs}
                intrinsic-duration-ms=${intrinsicDurationMs}
                @trim-change=${this.handleTrimChange}
              ></ef-trim-handles>`
            : nothing}
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    return renderFilmstripChildren(
      Array.from(this.element.children),
      this.pixelsPerMs,
      this.hideSelectors,
      this.showSelectors,
    );
  }

  @property({ type: Array, attribute: false })
  hideSelectors?: string[];

  @property({ type: Array, attribute: false })
  showSelectors?: string[];

  contents() {
    return html``;
  }

  animations() {
    const animations = this.element.getAnimations();
    return animations.map((animation) => {
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect)) {
        return nothing;
      }
      const start = effect.getTiming().delay ?? 0;
      const duration = effect.getTiming().duration;
      if (duration === null) {
        return nothing;
      }
      const keyframes = effect.getKeyframes();
      const firstKeyframe = keyframes[0];
      if (!firstKeyframe) {
        return nothing;
      }
      const properties = new Set(Object.keys(firstKeyframe));
      for (const key of CommonEffectKeys) {
        properties.delete(key);
      }

      return html`<div
        class="relative h-[5px] opacity-50"
        label="animation"
        style=${styleMap({
          left: `${this.pixelsPerMs * start}px`,
          width: `${this.pixelsPerMs * Number(duration)}px`,
          backgroundColor: "var(--filmstrip-animation-bg)",
        })}
      >
        <!-- <div class="text-nowrap">${Array.from(properties).join(" ")}</div> -->
        ${effect.getKeyframes().map((keyframe) => {
          return html`<div
            class="absolute top-0 h-full w-1"
            style=${styleMap({
              left: `${
                this.pixelsPerMs * keyframe.computedOffset * Number(duration)
              }px`,
              backgroundColor: "var(--filmstrip-keyframe-bg)",
            })}
          ></div>`;
        })}
      </div>`;
    });
  }

  protected filmstripController?: ElementFilmstripController;

  update(changedProperties: Map<string | number | symbol, unknown>) {
    if (
      changedProperties.has("element") &&
      this.element instanceof LitElement
    ) {
      this.filmstripController?.remove();
      this.filmstripController = new ElementFilmstripController(
        this.element,
        this,
      );
    }
    super.update(changedProperties);
  }
}

@customElement("ef-audio-filmstrip")
export class EFAudioFilmstrip extends FilmstripItem {
  contents() {
    return html``;
  }
}

@customElement("ef-video-filmstrip")
export class EFVideoFilmstrip extends FilmstripItem {
  static styles = [
    FilmstripItem.styles,
    css`
      ef-thumbnail-strip {
        height: 100%;
        border: none;
        border-radius: 0;
        background: transparent;
      }
    `,
  ];

  render() {
    const video = this.element as EFVideo;
    const elementId = (this.element as HTMLElement).id || "";
    const trimStartMs = this.element.trimStartMs ?? 0;
    const trimEndMs = this.element.trimEndMs ?? 0;
    const intrinsicDurationMs = this.element.intrinsicDurationMs ?? this.element.durationMs;

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
          class="trim-container border-outset relative mb-[1px] block h-[48px] text-nowrap border text-sm"
          style=${styleMap({
            ...this.trimPortionStyles,
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
          ${this.enableTrim
            ? html`<ef-trim-handles
                element-id=${elementId}
                pixels-per-ms=${this.pixelsPerMs}
                trim-start-ms=${trimStartMs}
                trim-end-ms=${trimEndMs}
                intrinsic-duration-ms=${intrinsicDurationMs}
                @trim-change=${this.handleTrimChange}
              ></ef-trim-handles>`
            : nothing}
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }
}

@customElement("ef-captions-filmstrip")
export class EFCaptionsFilmstrip extends FilmstripItem {
  render() {
    const captions = this.element as EFCaptions;
    const captionsData = captions.unifiedCaptionsDataTask.value;

    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        class="relative"
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
          class="border-outset relative mb-[1px] block h-[1.1rem] text-nowrap border text-sm overflow-hidden"
          style=${styleMap({
            ...this.trimPortionStyles,
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: "var(--filmstrip-border)",
          })}
        >
          📝 ${this.renderCaptionsData(captionsData)}
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }

  renderCaptionsData(captionsData: Caption | null | undefined) {
    if (!captionsData) {
      return html``;
    }

    // Get current time for highlighting active elements
    const captions = this.element as EFCaptions;
    const rootTimegroup = captions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - captions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    // Show all segments with text content, let them clip naturally
    const segmentElements = captionsData.segments.map((segment) => {
      const isActive =
        captionsLocalTimeSec >= segment.start &&
        captionsLocalTimeSec < segment.end;

      return html`<div
        class="absolute border text-xs overflow-hidden flex items-center ${isActive ? "font-bold z-[5]" : ""}"
        style=${styleMap({
          left: `${this.pixelsPerMs * segment.start * 1000}px`,
          width: `${this.pixelsPerMs * (segment.end - segment.start) * 1000}px`,
          height: "100%",
          top: "0px",
          backgroundColor: isActive
            ? "var(--filmstrip-segment-bg)"
            : "var(--filmstrip-item-bg)",
          borderColor: isActive
            ? "var(--filmstrip-segment-border)"
            : "var(--filmstrip-border)",
        })}
        title="Segment: '${segment.text}' (${segment.start}s - ${segment.end}s)"
      >
        <span class="px-0.5 text-[8px] ${isActive ? "font-bold" : ""}">${segment.text}</span>
      </div>`;
    });

    return html`${segmentElements}`;
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    // Also render normal DOM children (like ef-captions-active-word elements)
    return renderFilmstripChildren(
      Array.from(this.element.children),
      this.pixelsPerMs,
      this.hideSelectors,
      this.showSelectors,
    );
  }
}

@customElement("ef-captions-active-word-filmstrip")
export class EFCaptionsActiveWordFilmstrip extends FilmstripItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    // Get parent captions element and its data
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          🗣️ Active Word
        </div>
      </div>`;
    }

    // Get current time for highlighting
    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-caption-bg)"
                : "var(--filmstrip-item-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-caption-border)"
                : "var(--filmstrip-border)",
            })}
            title="Word: '${word.text}' (${word.start}s - ${word.end}s)"
          >
            ${isCurrentlyActive ? html`<span class="px-0.5 text-[8px] font-bold whitespace-nowrap" style="background-color: var(--filmstrip-caption-bg);">${word.text.trim()}</span>` : ""}
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-captions-segment-filmstrip")
export class EFCaptionsSegmentFilmstrip extends FilmstripItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    // Get parent captions element and its data
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          📄 Segment
        </div>
      </div>`;
    }

    // Get current time for highlighting
    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.segments.map((segment) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= segment.start &&
            captionsLocalTimeSec < segment.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * segment.start * 1000}px`,
              width: `${this.pixelsPerMs * (segment.end - segment.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-segment-bg)"
                : "var(--filmstrip-item-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-segment-border)"
                : "var(--filmstrip-border)",
            })}
            title="Segment: '${segment.text}' (${segment.start}s - ${segment.end}s)"
          >
            ${isCurrentlyActive ? html`<span class="px-0.5 text-[8px] font-bold whitespace-nowrap" style="background-color: var(--filmstrip-segment-bg);">${segment.text}</span>` : ""}
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-captions-before-word-filmstrip")
export class EFCaptionsBeforeWordFilmstrip extends FilmstripItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    // Get parent captions element and its data
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ⬅️ Before
        </div>
      </div>`;
    }

    // Get current time for highlighting
    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-caption-bg)"
                : "var(--filmstrip-waveform-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-caption-border)"
                : "var(--filmstrip-waveform-border)",
            })}
            title="Word: '${word.text}' (${word.start}s - ${word.end}s)"
          >
            <!-- No text for before tracks - they're redundant -->
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-captions-after-word-filmstrip")
export class EFCaptionsAfterWordFilmstrip extends FilmstripItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    // Get parent captions element and its data
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ➡️ After
        </div>
      </div>`;
    }

    // Get current time for highlighting
    const rootTimegroup = parentCaptions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - parentCaptions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

    return html`<div style=${styleMap(this.captionsTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
              backgroundColor: isCurrentlyActive
                ? "var(--filmstrip-caption-bg)"
                : "var(--filmstrip-waveform-bg)",
              borderColor: isCurrentlyActive
                ? "var(--filmstrip-caption-border)"
                : "var(--filmstrip-waveform-border)",
            })}
            title="Word: '${word.text}' (${word.start}s - ${word.end}s)"
          >
            <!-- No text for after tracks - they're redundant -->
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-waveform-filmstrip")
export class EFWaveformFilmstrip extends FilmstripItem {
  contents() {
    return html` 🌊 `;
  }

  renderChildren(): typeof nothing {
    return nothing;
  }
}

@customElement("ef-text-filmstrip")
export class EFTextFilmstrip extends FilmstripItem {
  render() {
    const text = this.element as EFText;
    const segments = Array.from(text.querySelectorAll("ef-text-segment"));

    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        class="relative"
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
          class="border-outset relative mb-[1px] block h-[1.1rem] text-nowrap border text-sm overflow-hidden"
          style=${styleMap({
            ...this.trimPortionStyles,
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: "var(--filmstrip-border)",
          })}
        >
          📄 ${this.renderTextSegments(segments)}
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }

  renderTextSegments(segments: EFTextSegment[]) {
    if (segments.length === 0) {
      return html``;
    }

    // Get current time for highlighting active segments
    const text = this.element as EFText;
    const rootTimegroup = text.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const textLocalTimeMs = currentTimeMs - text.startTimeMs;

    return segments.map((segment) => {
      const isActive =
        textLocalTimeMs >= segment.segmentStartMs &&
        textLocalTimeMs < segment.segmentEndMs;

      return html`<div
        class="absolute border text-xs overflow-hidden flex items-center ${isActive ? "font-bold z-[5]" : ""}"
        style=${styleMap({
          left: `${this.pixelsPerMs * segment.segmentStartMs}px`,
          width: `${this.pixelsPerMs * (segment.segmentEndMs - segment.segmentStartMs)}px`,
          height: "100%",
          top: "0px",
          backgroundColor: isActive
            ? "var(--filmstrip-segment-bg)"
            : "var(--filmstrip-item-bg)",
          borderColor: isActive
            ? "var(--filmstrip-segment-border)"
            : "var(--filmstrip-border)",
        })}
        title="Segment: '${segment.segmentText}' (${segment.segmentStartMs}ms - ${segment.segmentEndMs}ms)"
      >
        <span class="px-0.5 text-[8px] ${isActive ? "font-bold" : ""}">${segment.segmentText}</span>
      </div>`;
    });
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    return renderFilmstripChildren(
      Array.from(this.element.children),
      this.pixelsPerMs,
      this.hideSelectors,
      this.showSelectors,
    );
  }
}

@customElement("ef-text-segment-filmstrip")
export class EFTextSegmentFilmstrip extends FilmstripItem {
  get textTrackStyles() {
    const parentText = this.element.closest("ef-text") as EFText;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentText?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentText?.durationMs || 0)}px`,
    };
  }

  render() {
    const segment = this.element as EFTextSegment;
    const parentText = segment.closest("ef-text") as EFText;

    if (!parentText) {
      return html`<div style=${styleMap(this.textTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          📄 Text Segment
        </div>
      </div>`;
    }

    // Get current time for highlighting
    const rootTimegroup = parentText.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const textLocalTimeMs = currentTimeMs - parentText.startTimeMs;

    const isCurrentlyActive =
      textLocalTimeMs >= segment.segmentStartMs &&
      textLocalTimeMs < segment.segmentEndMs;

    return html`<div style=${styleMap(this.textTrackStyles)}>
      <div class="relative border h-[1.1rem] mb-[1px] w-full" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
        <div
          class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "font-bold z-[5]" : ""}"
          style=${styleMap({
            left: `${this.pixelsPerMs * segment.segmentStartMs}px`,
            width: `${this.pixelsPerMs * (segment.segmentEndMs - segment.segmentStartMs)}px`,
            height: "100%",
            top: "0px",
            backgroundColor: isCurrentlyActive
              ? "var(--filmstrip-caption-bg)"
              : "var(--filmstrip-item-bg)",
            borderColor: isCurrentlyActive
              ? "var(--filmstrip-caption-border)"
              : "var(--filmstrip-border)",
          })}
          title="Segment: '${segment.segmentText}' (${segment.segmentStartMs}ms - ${segment.segmentEndMs}ms)"
        >
          ${isCurrentlyActive ? html`<span class="px-0.5 text-[8px] font-bold whitespace-nowrap" style="background-color: var(--filmstrip-caption-bg);">${segment.segmentText}</span>` : ""}
        </div>
      </div>
    </div>`;
  }
}

@customElement("ef-image-filmstrip")
export class EFImageFilmstrip extends FilmstripItem {
  contents() {
    return html` 🖼️ `;
  }
}

@customElement("ef-timegroup-filmstrip")
export class EFTimegroupFilmstrip extends FilmstripItem {
  contents() {
    return html`
      <span>TIME GROUP</span>
      ${renderFilmstripChildren(
        Array.from(this.element.children || []),
        this.pixelsPerMs,
        this.hideSelectors,
        this.showSelectors,
      )}
    </div>
    `;
  }
}

@customElement("ef-html-filmstrip")
export class EFHTMLFilmstrip extends FilmstripItem {
  contents() {
    return html`
      <span>${this.element.tagName}</span>
      ${renderFilmstripChildren(
        Array.from(this.element.children || []),
        this.pixelsPerMs,
        this.hideSelectors,
        this.showSelectors,
      )}
    `;
  }
}

const renderFilmstripChildren = (
  children: Element[],
  pixelsPerMs: number,
  hideSelectors?: string[],
  showSelectors?: string[],
  skipRootFiltering = false,
): Array<TemplateResult<1> | typeof nothing> => {
  return children.map((child) => {
    if (
      !skipRootFiltering &&
      !shouldRenderElement(child, hideSelectors, showSelectors)
    ) {
      return nothing;
    }

    if (child instanceof EFTimegroup) {
      return html`<ef-timegroup-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      >
      </ef-timegroup-filmstrip>`;
    }
    if (child instanceof EFImage) {
      return html`<ef-image-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-image-filmstrip>`;
    }
    if (child instanceof EFAudio) {
      return html`<ef-audio-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-audio-filmstrip>`;
    }
    if (child instanceof EFVideo) {
      return html`<ef-video-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-video-filmstrip>`;
    }
    if (child instanceof EFCaptions) {
      return html`<ef-captions-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-filmstrip>`;
    }
    if (child instanceof EFCaptionsActiveWord) {
      return html`<ef-captions-active-word-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-active-word-filmstrip>`;
    }
    if (child instanceof EFText) {
      return html`<ef-text-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-text-filmstrip>`;
    }
    if (child instanceof EFTextSegment) {
      return html`<ef-text-segment-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-text-segment-filmstrip>`;
    }
    if (child.tagName === "EF-CAPTIONS-SEGMENT") {
      return html`<ef-captions-segment-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-segment-filmstrip>`;
    }
    if (child.tagName === "EF-CAPTIONS-BEFORE-ACTIVE-WORD") {
      return html`<ef-captions-before-word-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-before-word-filmstrip>`;
    }
    if (child.tagName === "EF-CAPTIONS-AFTER-ACTIVE-WORD") {
      return html`<ef-captions-after-word-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-after-word-filmstrip>`;
    }
    if (child instanceof EFWaveform) {
      return html`<ef-waveform-filmstrip
        .element=${child}
        .pixelsPerMs=${pixelsPerMs}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-waveform-filmstrip>`;
    }
    // Skip non-temporal HTML elements (divs, spans, etc.) in the filmstrip
    // They don't have temporal properties and shouldn't appear in the timeline
    return nothing;
  });
};

@customElement("ef-filmstrip")
export class EFFilmstrip extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
        overflow: hidden;
        width: 100%;
        height: 100%;
        
        /* Light mode colors */
        --filmstrip-bg: rgb(203 213 225); /* slate-300 */
        --filmstrip-border: rgb(100 116 139); /* slate-500 */
        --filmstrip-item-bg: rgb(191 219 254); /* blue-200 */
        --filmstrip-item-focused: rgb(148 163 184); /* slate-400 */
        --filmstrip-animation-bg: rgb(59 130 246); /* blue-500 */
        --filmstrip-keyframe-bg: rgb(239 68 68); /* red-500 */
        --filmstrip-caption-bg: rgb(254 240 138); /* yellow-200 */
        --filmstrip-caption-border: rgb(234 179 8); /* yellow-500 */
        --filmstrip-segment-bg: rgb(187 247 208); /* green-200 */
        --filmstrip-segment-border: rgb(34 197 94); /* green-500 */
        --filmstrip-waveform-bg: rgb(250 245 255); /* purple-50 */
        --filmstrip-waveform-border: rgb(233 213 255); /* purple-200 */
        --filmstrip-timegroup-bg: rgb(226 232 240); /* slate-200 */
        --filmstrip-timegroup-hover: rgb(148 163 184); /* slate-400 */
        --filmstrip-timegroup-focused: rgb(148 163 184); /* slate-400 */
        --filmstrip-gutter-bg: rgb(241 245 249); /* slate-100 */
        --filmstrip-timeline-bg: rgb(226 232 240); /* slate-200 */
        --filmstrip-playhead: rgb(185 28 28); /* red-700 */
      }
      
      :host(.dark), :host-context(.dark) {
        /* Dark mode colors */
        --filmstrip-bg: rgb(71 85 105); /* slate-600 */
        --filmstrip-border: rgb(148 163 184); /* slate-400 */
        --filmstrip-item-bg: rgb(30 64 175); /* blue-800 */
        --filmstrip-item-focused: rgb(100 116 139); /* slate-500 */
        --filmstrip-animation-bg: rgb(96 165 250); /* blue-400 */
        --filmstrip-keyframe-bg: rgb(248 113 113); /* red-400 */
        --filmstrip-caption-bg: rgb(133 77 14); /* yellow-800 */
        --filmstrip-caption-border: rgb(250 204 21); /* yellow-400 */
        --filmstrip-segment-bg: rgb(22 101 52); /* green-800 */
        --filmstrip-segment-border: rgb(74 222 128); /* green-400 */
        --filmstrip-waveform-bg: rgb(88 28 135); /* purple-900 */
        --filmstrip-waveform-border: rgb(126 34 206); /* purple-700 */
        --filmstrip-timegroup-bg: rgb(51 65 85); /* slate-700 */
        --filmstrip-timegroup-hover: rgb(100 116 139); /* slate-500 */
        --filmstrip-timegroup-focused: rgb(100 116 139); /* slate-500 */
        --filmstrip-gutter-bg: rgb(30 41 59); /* slate-800 */
        --filmstrip-timeline-bg: rgb(51 65 85); /* slate-700 */
        --filmstrip-playhead: rgb(239 68 68); /* red-500 */
      }
    `,
  ];
  @property({ type: Number })
  pixelsPerMs = 0.04;

  @property({ type: Boolean, attribute: "hide-playhead" })
  hidePlayhead = false;

  /**
   * When true, disables internal horizontal scrolling on the gutter.
   * Used when filmstrip is embedded in EFTimeline which handles scrolling externally.
   */
  @property({ type: Boolean, attribute: "disable-internal-scroll" })
  disableInternalScroll = false;

  @property({ type: String })
  hide = "";

  @property({ type: String })
  show = "";

  get hideSelectors(): string[] | undefined {
    if (!this.hide) return undefined;
    return this.hide
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  get showSelectors(): string[] | undefined {
    if (!this.show) return undefined;
    return this.show
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  @state()
  scrubbing = false;

  private capturedPointerId: number | null = null;

  @state()
  timelineScrolltop = 0;

  timegroupController?: TimegroupController;

  @state()
  currentTimeMs = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.#bindToTargetTimegroup();
    window.addEventListener("keypress", this.#handleKeyPress);

    if (this.target) {
      this.#targetController = new TargetController(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keypress", this.#handleKeyPress);
  }

  #bindToTargetTimegroup() {
    if (this.timegroupController) {
      this.timegroupController.remove();
    }
    const target = this.targetTemporal;
    if (target) {
      this.timegroupController = new TimegroupController(
        target as EFTimegroup,
        this,
      );
      // Set the current time to the last saved time to avoid a cycle
      // where the filmstrip clobbers the time loaded from localStorage
      this.currentTimeMs = target.currentTimeMs;
    }
  }

  #handleKeyPress = (event: KeyboardEvent) => {
    // On spacebar, toggle playback
    if (event.key === " ") {
      const [target] = event.composedPath();
      // CSS selector to match all interactive elements
      const interactiveSelector =
        "input, textarea, button, select, a, [contenteditable]";

      // Check if the event target or its ancestor matches an interactive element
      const closestInteractive = (target as HTMLElement | null)?.closest(
        interactiveSelector,
      );
      if (closestInteractive) {
        return;
      }
      event.preventDefault();
      if (this.#contextElement) {
        this.#contextElement.playing = !this.#contextElement.playing;
      }
    }
  };

  @eventOptions({ passive: false })
  syncGutterScroll() {
    if (this.gutter && this.hierarchyRef.value) {
      this.hierarchyRef.value.scrollTop = this.gutter.scrollTop;
      this.timelineScrolltop = this.gutter.scrollTop;
    }
  }

  @eventOptions({ passive: false })
  syncHierarchyScroll() {
    if (this.gutter && this.hierarchyRef.value) {
      this.gutter.scrollTop = this.hierarchyRef.value.scrollTop;
      this.timelineScrolltop = this.hierarchyRef.value.scrollTop;
    }
  }

  @eventOptions({ capture: false, passive: false })
  scrub(e: PointerEvent) {
    if (this.playing) {
      return;
    }
    if (!this.scrubbing) {
      return;
    }
    if (
      this.capturedPointerId !== null &&
      e.pointerId !== this.capturedPointerId
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.applyScrub(e);
  }

  @eventOptions({ capture: false, passive: false })
  startScrub(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.scrubbing = true;
    this.capturedPointerId = e.pointerId;

    const target = e.currentTarget as HTMLElement;
    if (target) {
      try {
        target.setPointerCapture(e.pointerId);
      } catch (err) {
        // setPointerCapture may fail in some cases, continue anyway
        console.warn("Failed to set pointer capture:", err);
      }
    }

    // Running scrub in the current microtask doesn't
    // result in an actual update. Not sure why.
    queueMicrotask(() => {
      this.applyScrub(e);
    });

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === this.capturedPointerId) {
        upEvent.preventDefault();
        upEvent.stopPropagation();
        if (target) {
          try {
            target.releasePointerCapture(upEvent.pointerId);
          } catch (_err) {
            // releasePointerCapture may fail if capture was already lost
          }
        }
        this.capturedPointerId = null;
        this.scrubbing = false;
        removeEventListener("pointerup", handlePointerUp);
      }
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === this.capturedPointerId) {
        if (target) {
          try {
            target.releasePointerCapture(cancelEvent.pointerId);
          } catch (_err) {
            // releasePointerCapture may fail if capture was already lost
          }
        }
        this.capturedPointerId = null;
        this.scrubbing = false;
        removeEventListener("pointercancel", handlePointerCancel);
      }
    };

    addEventListener("pointerup", handlePointerUp, {
      once: true,
      passive: false,
    });
    addEventListener("pointercancel", handlePointerCancel, {
      once: true,
      passive: false,
    });
  }

  @eventOptions({ passive: false, capture: false })
  handleContextMenu(e: Event) {
    if (this.scrubbing) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  applyScrub(e: PointerEvent) {
    const gutter = this.shadowRoot?.querySelector("#gutter");
    if (!gutter) {
      return;
    }
    const rect = gutter.getBoundingClientRect();
    if (this.targetTemporal) {
      const layerX = e.pageX - rect.left + gutter.scrollLeft;
      const scrubTimeMs = layerX / this.pixelsPerMs;
      this.targetTemporal.currentTimeMs = scrubTimeMs;
    }
  }

  @eventOptions({ passive: false })
  scrollScrub(e: WheelEvent) {
    if (this.targetTemporal && this.gutter && !this.playing) {
      if (e.deltaX !== 0) {
        e.preventDefault(); // Prevent default side scroll behavior only
      }
      // Avoid over-scrolling to the left
      if (
        this.gutterRef.value &&
        this.gutterRef.value.scrollLeft === 0 &&
        e.deltaX < 0
      ) {
        this.gutter.scrollBy(0, e.deltaY);
        return;
      }

      // Avoid over-scrolling to the right
      if (
        this.gutter.scrollWidth - this.gutter.scrollLeft ===
          this.gutter.clientWidth &&
        e.deltaX > 0
      ) {
        this.gutter.scrollBy(0, e.deltaY);
        return;
      }

      if (this) {
        this.gutter.scrollBy(e.deltaX, e.deltaY);
        this.targetTemporal.currentTimeMs += e.deltaX / this.pixelsPerMs;
      }
    }
  }

  gutterRef = createRef<HTMLDivElement>();
  hierarchyRef = createRef<HTMLDivElement>();
  playheadRef = createRef<HTMLDivElement>();

  get gutter() {
    return this.gutterRef.value;
  }

  render() {
    const target = this.targetTemporal;

    return html`
      <div class="grid h-full" style=${styleMap({
        gridTemplateColumns: "200px 1fr",
        gridTemplateRows: "1fr",
        backgroundColor: "var(--filmstrip-gutter-bg)",
      })}>
        <div
          class="z-10 pl-1 pr-1 pt-[8px] shadow ${this.disableInternalScroll ? 'overflow-visible' : 'overflow-auto'}"
          ${ref(this.hierarchyRef)}
          @scroll=${this.disableInternalScroll ? nothing : this.syncHierarchyScroll}
        >
          ${renderHierarchyChildren(
            target ? ([target] as unknown as Element[]) : [],
            this.hideSelectors,
            this.showSelectors,
            true,
            true,
          )}
        </div>
        <div
          class="flex h-full w-full cursor-crosshair pt-[8px] touch-pan-x ${this.disableInternalScroll ? 'overflow-visible' : 'overflow-auto'}"
          style="background-color: var(--filmstrip-timeline-bg);"
          id="gutter"
          ${ref(this.gutterRef)}
          @scroll=${this.disableInternalScroll ? nothing : this.syncGutterScroll}
          @wheel=${this.disableInternalScroll ? nothing : this.scrollScrub}
        >
          <div
            class="relative h-full w-full touch-none"
            style="width: ${this.pixelsPerMs * (target?.durationMs ?? 0)}px; touch-action: none; user-select: none;"
            @pointermove=${this.scrub}
            @pointerdown=${this.startScrub}
            @contextmenu=${this.handleContextMenu}
          >
            ${this.hidePlayhead ? nothing : html`<div
              class="border-red pointer-events-none absolute z-[20] h-full w-[2px] border-r-2"
              style=${styleMap({
                left: `${this.pixelsPerMs * this.currentTimeMs}px`,
                top: `${this.timelineScrolltop}px`,
                borderColor: "var(--filmstrip-playhead)",
              })}
              ${ref(this.playheadRef)}
            ></div>`}

            ${renderFilmstripChildren(
              target ? ([target] as unknown as Element[]) : [],
              this.pixelsPerMs,
              this.hideSelectors,
              this.showSelectors,
              true,
            )}
          </div>
        </div>
      </div>
    `;
  }

  updated(changes: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (!this.targetTemporal) {
      return;
    }
    if (changes.has("currentTimeMs")) {
      if (this.targetTemporal.currentTimeMs !== this.currentTimeMs) {
        this.targetTemporal.currentTimeMs = this.currentTimeMs;
      }
    }
  }

  get #contextElement(): EFWorkbench | EFPreview | null {
    return this.closest("ef-workbench, ef-preview") as EFWorkbench | EFPreview;
  }

  @property({ type: String })
  target = "";

  @state()
  targetElement: Element | null = null;

  #targetController?: TargetController;
  #lastTargetTemporal?: TemporalMixinInterface | null;

  @consume({ context: targetTemporalContext, subscribe: true })
  @state()
  private _contextProvidedTemporal?: TemporalMixinInterface | null;

  get targetTemporal(): TemporalMixinInterface | null {
    const fromTarget =
      this.targetElement && isEFTemporal(this.targetElement)
        ? (this.targetElement as TemporalMixinInterface & HTMLElement)
        : null;
    const fromContext = this._contextProvidedTemporal;

    if (fromTarget && fromContext && fromTarget !== fromContext) {
      console.warn(
        "EFFilmstrip: Both target attribute and parent context found. Using target attribute.",
        { target: this.target, fromTarget, fromContext },
      );
    }

    return fromTarget ?? fromContext ?? null;
  }

  protected willUpdate(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ) {
    if (changedProperties.has("target")) {
      if (this.target && !this.#targetController) {
        this.#targetController = new TargetController(this);
      }
    }

    const currentTargetTemporal = this.targetTemporal;
    if (this.#lastTargetTemporal !== currentTargetTemporal) {
      this.#bindToTargetTimegroup();
      this.#lastTargetTemporal = currentTargetTemporal;
    }

    super.willUpdate(changedProperties);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-filmstrip": EFFilmstrip;
    "ef-timegroup-filmstrip": EFTimegroupFilmstrip;
    "ef-audio-filmstrip": EFAudioFilmstrip;
    "ef-video-filmstrip": EFVideoFilmstrip;
    "ef-captions-filmstrip": EFCaptionsFilmstrip;
    "ef-captions-active-word-filmstrip": EFCaptionsActiveWordFilmstrip;
    "ef-captions-segment-filmstrip": EFCaptionsSegmentFilmstrip;
    "ef-captions-before-word-filmstrip": EFCaptionsBeforeWordFilmstrip;
    "ef-captions-after-word-filmstrip": EFCaptionsAfterWordFilmstrip;
    "ef-text-filmstrip": EFTextFilmstrip;
    "ef-text-segment-filmstrip": EFTextSegmentFilmstrip;
    "ef-waveform-filmstrip": EFWaveformFilmstrip;
    "ef-image-filmstrip": EFImageFilmstrip;
    "ef-html-filmstrip": EFHTMLFilmstrip;
  }
}
