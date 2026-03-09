import { consume } from "@lit/context";
import { css, html, nothing, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFText } from "../../../elements/EFText.js";
import { EFTextSegment } from "../../../elements/EFTextSegment.js";
import { currentTimeContext } from "../../currentTimeContext.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";
import { renderTrackChildren } from "./renderTrackChildren.js";

@customElement("ef-text-track")
export class EFTextTrack extends TrackItem {
  @consume({ context: currentTimeContext, subscribe: true })
  contextCurrentTimeMs = 0;
  static styles = [
    ...TrackItem.styles,
    css`
      .text-segment-block {
        position: absolute;
        height: calc(100% - 4px);
        top: 2px;
        display: flex;
        align-items: center;
        padding: 0 4px;
        border-radius: 2px;
        overflow: hidden;
        background: color-mix(in srgb, var(--ef-color-type-text) 15%, transparent);
      }
      
      .text-segment-block.active {
        background: color-mix(in srgb, var(--ef-color-type-text) 35%, transparent);
      }
      
      .text-segment-block:hover {
        z-index: 100;
        overflow: visible;
        width: max-content !important;
        min-width: max-content;
        background: var(--ef-color-bg-elevated);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
      
      .segment-text {
        font-size: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--ef-color-text);
      }
      
      .text-segment-block:hover .segment-text {
        overflow: visible;
        text-overflow: clip;
      }
      
      .text-segment-block.active .segment-text {
        font-weight: 500;
        color: white;
      }
      
      /* Compact mode - single block for full text */
      .text-compact-block {
        position: absolute;
        left: 4px;
        right: 4px;
        top: 2px;
        bottom: 2px;
        display: flex;
        align-items: center;
        padding: 0 4px;
        overflow: hidden;
        border-radius: 2px;
        background: color-mix(in srgb, var(--ef-color-type-text) 10%, transparent);
      }
      
      .text-compact-block:hover {
        overflow: visible;
        z-index: 100;
        width: max-content;
        background: var(--ef-color-bg-elevated);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
    `,
  ];

  /**
   * Get the text content - from segments, direct text nodes, or element textContent
   */
  #getTextContent(segments: EFTextSegment[]): string {
    const text = this.element as EFText;

    // If there are segments, use their text
    if (segments.length > 0) {
      return segments.map((s) => s.segmentText).join(" ");
    }

    // Try direct text nodes (excluding templates and other elements)
    const directText = Array.from(text.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .join(" ");

    if (directText) return directText;

    // Ultimate fallback: use the element's full text content
    // (excluding script/style content but including nested text)
    const fullText = text.textContent?.trim() || "";
    return fullText;
  }

  /**
   * Check if segments can fit individually based on track width
   */
  #canShowSegmentsIndividually(segments: EFTextSegment[], trackWidthPx: number): boolean {
    if (segments.length === 0) return false;
    // Need at least 20px per segment
    return trackWidthPx >= segments.length * 20;
  }

  render() {
    const text = this.element as EFText;
    const segments = Array.from(text.querySelectorAll("ef-text-segment")) as EFTextSegment[];
    const textContent = this.#getTextContent(segments);
    const durationMs = text.durationMs ?? 0;
    const trackWidthPx = durationMs * this.pixelsPerMs;
    const canShowSegments = this.#canShowSegmentsIndividually(segments, trackWidthPx);

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
          class="relative mb-[1px] block h-[1.1rem] text-nowrap border text-sm overflow-visible"
          style=${styleMap({
            ...this.trimPortionStyles,
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: "var(--filmstrip-border)",
            borderLeftColor: this.getElementTypeColor(),
            borderLeftWidth: "3px",
          })}
        >
          ${
            segments.length > 0 && canShowSegments
              ? this.#renderSegments(segments, durationMs)
              : this.#renderCompactText(textContent)
          }
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }

  /**
   * Render segments as positioned blocks (like captions)
   */
  #renderSegments(segments: EFTextSegment[], durationMs: number) {
    const text = this.element as EFText;
    const currentTimeMs = this.contextCurrentTimeMs || 0;
    const textLocalTimeMs = currentTimeMs - text.startTimeMs;

    return segments.map((segment, index) => {
      const staggerOffset = segment.staggerOffsetMs ?? 0;
      // Segment becomes active at its stagger offset
      const isActive = textLocalTimeMs >= staggerOffset;

      // Calculate segment width - distribute evenly or use stagger spacing
      const nextSegment = segments[index + 1];
      const nextStagger = nextSegment?.staggerOffsetMs ?? durationMs;
      const segmentWidthMs = nextStagger - staggerOffset;
      const segmentWidthPx = Math.max(this.pixelsPerMs * segmentWidthMs, 18);

      return html`<div
        class="text-segment-block ${isActive ? "active" : ""}"
        style=${styleMap({
          left: `${this.pixelsPerMs * staggerOffset}px`,
          width: `${segmentWidthPx}px`,
        })}
        title="${segment.segmentText}"
      >
        <span class="segment-text">${segment.segmentText}</span>
      </div>`;
    });
  }

  /**
   * Render compact text (no segments or not enough space)
   */
  #renderCompactText(textContent: string) {
    if (!textContent) return nothing;

    return html`
      <div class="text-compact-block">
        <span class="segment-text">${textContent}</span>
      </div>
    `;
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    const nonSegmentChildren = Array.from(this.element.children).filter(
      (child) => child.tagName?.toUpperCase() !== "EF-TEXT-SEGMENT",
    );

    if (nonSegmentChildren.length === 0) {
      return nothing;
    }

    return renderTrackChildren(
      nonSegmentChildren,
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
        </div>
      </div>`;
    }

    const rootTimegroup = parentText.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const textLocalTimeMs = currentTimeMs - parentText.startTimeMs;

    const isCurrentlyActive =
      textLocalTimeMs >= segment.segmentStartMs && textLocalTimeMs < segment.segmentEndMs;

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
