import { html, nothing, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFText } from "../../../elements/EFText.js";
import { EFTextSegment } from "../../../elements/EFTextSegment.js";
import { phosphorIcon, ICONS } from "../../icons.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";
import { renderTrackChildren } from "./renderTrackChildren.js";

@customElement("ef-text-track")
export class EFTextTrack extends TrackItem {
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
          ${phosphorIcon(ICONS.textT)} ${this.renderTextSegments(segments)}
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }

  renderTextSegments(segments: EFTextSegment[]) {
    if (segments.length === 0) {
      return html``;
    }

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
    return renderTrackChildren(
      Array.from(this.element.children),
      this.pixelsPerMs,
      this.hideSelectors,
      this.showSelectors,
      false,
      this.enableTrim,
    );
  }
}

@customElement("ef-text-segment-track")
export class EFTextSegmentTrack extends TrackItem {
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
          ${phosphorIcon(ICONS.textT)} Text Segment
        </div>
      </div>`;
    }

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

declare global {
  interface HTMLElementTagNameMap {
    "ef-text-track": EFTextTrack;
    "ef-text-segment-track": EFTextSegmentTrack;
  }
}

