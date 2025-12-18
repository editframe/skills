import { html, nothing, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import {
  type Caption,
  EFCaptions,
  EFCaptionsActiveWord,
} from "../../../elements/EFCaptions.js";
import { TrackItem } from "./TrackItem.js";
import { renderTrackChildren } from "./renderTrackChildren.js";

@customElement("ef-captions-track")
export class EFCaptionsTrack extends TrackItem {
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

    const captions = this.element as EFCaptions;
    const rootTimegroup = captions.rootTimegroup;
    const currentTimeMs = rootTimegroup?.currentTimeMs || 0;
    const captionsLocalTimeMs = currentTimeMs - captions.startTimeMs;
    const captionsLocalTimeSec = captionsLocalTimeMs / 1000;

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

@customElement("ef-captions-active-word-track")
export class EFCaptionsActiveWordTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          🗣️ Active Word
        </div>
      </div>`;
    }

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

@customElement("ef-captions-segment-track")
export class EFCaptionsSegmentTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          📄 Segment
        </div>
      </div>`;
    }

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

@customElement("ef-captions-before-word-track")
export class EFCaptionsBeforeWordTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ⬅️ Before
        </div>
      </div>`;
    }

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
          </div>`;
        })}
      </div>
    </div>`;
  }
}

@customElement("ef-captions-after-word-track")
export class EFCaptionsAfterWordTrack extends TrackItem {
  get captionsTrackStyles() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (parentCaptions?.startTimeWithinParentMs || 0)}px`,
      width: `${this.pixelsPerMs * (parentCaptions?.durationMs || 0)}px`,
    };
  }

  render() {
    const parentCaptions = this.element.closest("ef-captions") as EFCaptions;
    const captionsData = parentCaptions?.unifiedCaptionsDataTask.value;

    if (!captionsData) {
      return html`<div style=${styleMap(this.captionsTrackStyles)}>
        <div class="border h-[1.1rem] mb-[1px] text-xs" style="background-color: var(--filmstrip-bg); border-color: var(--filmstrip-border);">
          ➡️ After
        </div>
      </div>`;
    }

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
          </div>`;
        })}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-captions-track": EFCaptionsTrack;
    "ef-captions-active-word-track": EFCaptionsActiveWordTrack;
    "ef-captions-segment-track": EFCaptionsSegmentTrack;
    "ef-captions-before-word-track": EFCaptionsBeforeWordTrack;
    "ef-captions-after-word-track": EFCaptionsAfterWordTrack;
  }
}

