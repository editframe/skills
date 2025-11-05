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
import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../elements/EFTemporal.js";
import { EFTimegroup } from "../elements/EFTimegroup.js";
import { EFVideo } from "../elements/EFVideo.js";
import { EFWaveform } from "../elements/EFWaveform.js";
import { TargetController } from "../elements/TargetController.js";
import { TimegroupController } from "../elements/TimegroupController.js";
import { msToTimeCode } from "../msToTimeCode.js";
import { targetTemporalContext } from "./ContextMixin.ts";
import type { EFPreview } from "./EFPreview.js";
import type { EFWorkbench } from "./EFWorkbench.js";
import { type FocusContext, focusContext } from "./focusContext.js";
import { focusedElementContext } from "./focusedElementContext.js";
import { loopContext, playingContext } from "./playingContext.js";
import { TWMixin } from "./TWMixin.js";

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

  // Gutter styles represent the entire source media.
  // If there is no trim, then the gutter and trim portion are the same.
  get gutterStyles() {
    return {
      position: "relative",
      left: `${this.pixelsPerMs * (this.element.startTimeWithinParentMs - this.element.sourceStartMs)}px`,
      width: `${this.pixelsPerMs * (this.element.intrinsicDurationMs ?? this.element.durationMs)}px`,
    };
  }

  // Trim portion is the section of source that will be placed in the timeline
  // If there is no trim, then the gutter and trim portion are the same.
  get trimPortionStyles() {
    return {
      width: `${this.pixelsPerMs * this.element.durationMs}px`,
      left: `${this.pixelsPerMs * this.element.sourceStartMs}px`,
    };
  }

  render() {
    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        class="bg-slate-300"
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
          class="border-outset relative mb-[1px] block h-[1.1rem] text-nowrap border border-slate-500 bg-blue-200 text-sm data-[focused]:bg-slate-400"
          style=${styleMap(this.trimPortionStyles)}
        >
          ${this.animations()}
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
        class="relative h-[5px] bg-blue-500 opacity-50"
        label="animation"
        style=${styleMap({
          left: `${this.pixelsPerMs * start}px`,
          width: `${this.pixelsPerMs * Number(duration)}px`,
        })}
      >
        <!-- <div class="text-nowrap">${Array.from(properties).join(" ")}</div> -->
        ${effect.getKeyframes().map((keyframe) => {
          return html`<div
            class="absolute top-0 h-full w-1 bg-red-500"
            style=${styleMap({
              left: `${
                this.pixelsPerMs * keyframe.computedOffset * Number(duration)
              }px`,
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
  contents() {
    return html` 📼 `;
  }
}

@customElement("ef-captions-filmstrip")
export class EFCaptionsFilmstrip extends FilmstripItem {
  render() {
    const captions = this.element as EFCaptions;
    const captionsData = captions.unifiedCaptionsDataTask.value;

    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        class="bg-slate-300 relative"
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
          class="border-outset relative mb-[1px] block h-[1.1rem] text-nowrap border border-slate-500 bg-blue-200 text-sm data-[focused]:bg-slate-400 overflow-hidden"
          style=${styleMap(this.trimPortionStyles)}
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
        class="absolute border border-slate-600 text-xs overflow-hidden flex items-center ${isActive ? "bg-green-200 border-green-500 font-bold z-[5]" : "bg-slate-100"}"
        style=${styleMap({
          left: `${this.pixelsPerMs * segment.start * 1000}px`,
          width: `${this.pixelsPerMs * (segment.end - segment.start) * 1000}px`,
          height: "100%",
          top: "0px",
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
        <div class="bg-slate-300 border border-slate-500 h-[1.1rem] mb-[1px] text-xs">
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
      <div class="bg-slate-300 relative border border-slate-500 h-[1.1rem] mb-[1px] w-full">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "bg-yellow-200 border-yellow-500 font-bold z-[5]" : "bg-blue-50 border-blue-200"}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
            })}
            title="Word: '${word.text}' (${word.start}s - ${word.end}s)"
          >
            ${isCurrentlyActive ? html`<span class="px-0.5 text-[8px] font-bold whitespace-nowrap bg-yellow-200">${word.text.trim()}</span>` : ""}
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
        <div class="bg-slate-300 border border-slate-500 h-[1.1rem] mb-[1px] text-xs">
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
      <div class="bg-slate-300 relative border border-slate-500 h-[1.1rem] mb-[1px] w-full">
        ${captionsData.segments.map((segment) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= segment.start &&
            captionsLocalTimeSec < segment.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "bg-green-200 border-green-500 font-bold z-[5]" : "bg-green-50 border-green-200"}"
            style=${styleMap({
              left: `${this.pixelsPerMs * segment.start * 1000}px`,
              width: `${this.pixelsPerMs * (segment.end - segment.start) * 1000}px`,
              height: "100%",
              top: "0px",
            })}
            title="Segment: '${segment.text}' (${segment.start}s - ${segment.end}s)"
          >
            ${isCurrentlyActive ? html`<span class="px-0.5 text-[8px] font-bold whitespace-nowrap bg-green-200">${segment.text}</span>` : ""}
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
        <div class="bg-slate-300 border border-slate-500 h-[1.1rem] mb-[1px] text-xs">
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
      <div class="bg-slate-300 relative border border-slate-500 h-[1.1rem] mb-[1px] w-full">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "bg-yellow-200 border-yellow-500 font-bold z-[5]" : "bg-purple-50 border-purple-200"}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
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
        <div class="bg-slate-300 border border-slate-500 h-[1.1rem] mb-[1px] text-xs">
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
      <div class="bg-slate-300 relative border border-slate-500 h-[1.1rem] mb-[1px] w-full">
        ${captionsData.word_segments.map((word) => {
          const isCurrentlyActive =
            captionsLocalTimeSec >= word.start &&
            captionsLocalTimeSec < word.end;

          return html`<div
            class="absolute border text-xs overflow-visible flex items-center ${isCurrentlyActive ? "bg-yellow-200 border-yellow-500 font-bold z-[5]" : "bg-purple-50 border-purple-200"}"
            style=${styleMap({
              left: `${this.pixelsPerMs * word.start * 1000}px`,
              width: `${this.pixelsPerMs * (word.end - word.start) * 1000}px`,
              height: "100%",
              top: "0px",
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

@customElement("ef-hierarchy-item")
class EFHierarchyItem<
  ElementType extends HTMLElement = HTMLElement,
> extends TWMixin(LitElement) {
  @property({ type: Object, attribute: false })
  // @ts-expect-error This could be initialzed with any HTMLElement
  element: ElementType = new EFTimegroup();

  @consume({ context: focusContext })
  focusContext?: FocusContext;

  @consume({ context: focusedElementContext, subscribe: true })
  focusedElement?: HTMLElement | null;

  @property({ type: Array, attribute: false })
  hideSelectors?: string[];

  @property({ type: Array, attribute: false })
  showSelectors?: string[];

  get icon(): TemplateResult<1> | string {
    return "📼";
  }

  get isFocused() {
    return this.element && this.focusContext?.focusedElement === this.element;
  }

  displayLabel(): TemplateResult<1> | string | typeof nothing {
    return nothing;
  }

  render() {
    return html` 
      <div>
        <div
          class="peer 
            flex h-[1.1rem] items-center overflow-hidden text-nowrap  border border-slate-500
          bg-slate-200 pl-2 text-xs font-mono hover:bg-slate-400 data-[focused]:bg-slate-400"
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
          ${this.icon} ${this.displayLabel()}
        </div>
        <div
          class="p-[1px] pb-0 pl-2 pr-0 peer-hover:bg-slate-300 peer-data-[focused]:bg-slate-300 peer-hover:border-slate-400 peer-data-[focused]:border-slate-400""
        >
          ${this.renderChildren()}
        </div>
      </div>`;
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    return renderHierarchyChildren(
      Array.from(this.element.children),
      this.hideSelectors,
      this.showSelectors,
    );
  }
}

@customElement("ef-timegroup-hierarchy-item")
class EFTimegroupHierarchyItem extends EFHierarchyItem<EFTimegroup> {
  get icon() {
    return "🕒";
  }

  displayLabel(): string | TemplateResult<1> | typeof nothing {
    return this.element.mode ?? "(no mode)";
  }
}

@customElement("ef-audio-hierarchy-item")
class EFAudioHierarchyItem extends EFHierarchyItem<EFAudio> {
  get icon() {
    return "🔊";
  }

  displayLabel() {
    return this.element.src ?? "(no src)";
  }
}

@customElement("ef-video-hierarchy-item")
class EFVideoHierarchyItem extends EFHierarchyItem<EFVideo> {
  get icon() {
    return "📼";
  }

  displayLabel() {
    return this.element.src ?? "(no src)";
  }
}

@customElement("ef-captions-hierarchy-item")
class EFCaptionsHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "📝 Captions";
  }
}

@customElement("ef-captions-active-word-hierarchy-item")
class EFCaptionsActiveWordHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "🗣️ Active Word";
  }
}

@customElement("ef-waveform-hierarchy-item")
class EFWaveformHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "🌊";
  }

  renderChildren(): typeof nothing {
    return nothing;
  }
}

@customElement("ef-image-hierarchy-item")
class EFImageHierarchyItem extends EFHierarchyItem<EFImage> {
  get icon() {
    return "🖼️";
  }

  displayLabel() {
    return this.element.src ?? "(no src)";
  }
}

@customElement("ef-html-hierarchy-item")
class EFHTMLHierarchyItem extends EFHierarchyItem {
  get icon() {
    return html`<code>${`<${this.element.tagName.toLowerCase()}>`}</code>`;
  }
}

const shouldRenderElement = (
  element: Element,
  hideSelectors?: string[],
  showSelectors?: string[],
): boolean => {
  if (element instanceof HTMLElement && element.dataset?.efHidden) {
    return false;
  }

  // If show selectors are provided (allowlist mode), only render if matches
  if (showSelectors && showSelectors.length > 0) {
    return showSelectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }

  // If hide selectors are provided, don't render if matches
  if (hideSelectors && hideSelectors.length > 0) {
    return !hideSelectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }

  // No filters, render everything
  return true;
};

const renderHierarchyChildren = (
  children: Element[],
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
      return html`<ef-timegroup-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-timegroup-hierarchy-item>`;
    }
    if (child instanceof EFImage) {
      return html`<ef-image-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-image-hierarchy-item>`;
    }
    if (child instanceof EFAudio) {
      return html`<ef-audio-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-audio-hierarchy-item>`;
    }
    if (child instanceof EFVideo) {
      return html`<ef-video-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-video-hierarchy-item>`;
    }
    if (child instanceof EFCaptions) {
      return html`<ef-captions-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-hierarchy-item>`;
    }
    if (child instanceof EFCaptionsActiveWord) {
      return html`<ef-captions-active-word-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-active-word-hierarchy-item>`;
    }
    if (child instanceof EFWaveform) {
      return html`<ef-waveform-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-waveform-hierarchy-item>`;
    }
    return html`<ef-html-hierarchy-item
      .element=${child}
      .hideSelectors=${hideSelectors}
      .showSelectors=${showSelectors}
    ></ef-html-hierarchy-item>`;
  });
};

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
    return html`<ef-html-filmstrip
      .element=${child}
      .pixelsPerMs=${pixelsPerMs}
      .hideSelectors=${hideSelectors}
      .showSelectors=${showSelectors}
    ></ef-html-filmstrip>`;
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
      }
    `,
  ];
  @property({ type: Number })
  pixelsPerMs = 0.04;

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

  @state()
  timelineScrolltop = 0;

  @consume({ context: playingContext, subscribe: true })
  @state()
  playing?: boolean;

  @consume({ context: loopContext, subscribe: true })
  @state()
  loop?: boolean;

  timegroupController?: TimegroupController;

  @state()
  currentTimeMs = 0;

  @property({ type: Boolean, reflect: true, attribute: "auto-scale" })
  autoScale = false;

  private resizeObserver = new ResizeObserver(() => {
    if (this.autoScale) {
      this.updatePixelsPerMs();
    }
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.#bindToTargetTimegroup();
    window.addEventListener("keypress", this.#handleKeyPress);

    this.resizeObserver.observe(this);

    if (this.target) {
      this.#targetController = new TargetController(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keypress", this.#handleKeyPress);
    this.resizeObserver.disconnect();
  }

  updatePixelsPerMs() {
    const target = this.targetTemporal;
    const gutter = this.gutterRef.value;
    if (target && gutter && gutter.clientWidth > 0) {
      this.pixelsPerMs = gutter.clientWidth / (target.durationMs || 1);
    }
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

  @eventOptions({ capture: false })
  scrub(e: MouseEvent) {
    if (this.playing) {
      return;
    }
    if (!this.scrubbing) {
      return;
    }
    this.applyScrub(e);
  }

  @eventOptions({ capture: false })
  startScrub(e: MouseEvent) {
    e.preventDefault();
    this.scrubbing = true;
    // Running scrub in the current microtask doesn't
    // result in an actual update. Not sure why.
    queueMicrotask(() => {
      this.applyScrub(e);
    });
    addEventListener(
      "mouseup",
      () => {
        this.scrubbing = false;
      },
      { once: true },
    );
  }

  applyScrub(e: MouseEvent) {
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

    return html` <div
      class="grid h-full bg-slate-100"
      style=${styleMap({
        gridTemplateColumns: "200px 1fr",
        gridTemplateRows: "1.5rem 1fr",
      })}
    >
      <div
        class="z-20 col-span-2 border-b-slate-600 bg-slate-100 shadow shadow-slate-300"
      >
        ${
          !this.autoScale
            ? html`<input
              type="range"
              .value=${this.pixelsPerMs}
              min="0.01"
              max="0.1"
              step="0.001"
              @input=${(e: Event) => {
                const target = e.target as HTMLInputElement;
                this.pixelsPerMs = Number.parseFloat(target.value);
              }}
            />`
            : nothing
        }
        <code>${msToTimeCode(this.currentTimeMs, true)} </code> /
        <code>${msToTimeCode(target?.durationMs ?? 0, true)}</code>
        <ef-toggle-play class="inline-block mx-2">
          <div slot="pause"> 
            <button>⏸️</button>
          </div>
          <div slot="play">
            <button>▶️</button>
          </div>
        </ef-toggle-play>
        <ef-toggle-loop><button>${this.loop ? "🔁" : html`<span class="opacity-50 line-through">🔁</span>`}</button></ef-toggle-loop>
      </div>
      <div
        class="z-10 pl-1 pr-1 pt-[8px] shadow shadow-slate-600 overflow-auto"
        ${ref(this.hierarchyRef)}
        @scroll=${this.syncHierarchyScroll}
      >
        ${renderHierarchyChildren(
          target ? ([target] as unknown as Element[]) : [],
          this.hideSelectors,
          this.showSelectors,
          true,
        )}
      </div>
      <div
        class="flex h-full w-full cursor-crosshair overflow-auto bg-slate-200 pt-[8px]"
        id="gutter"
        ${ref(this.gutterRef)}
        @scroll=${this.syncGutterScroll}
        @wheel=${this.scrollScrub}
      >
        <div
          class="relative h-full w-full"
          style="width: ${this.pixelsPerMs * (target?.durationMs ?? 0)}px;"
          @mousemove=${this.scrub}
          @mousedown=${this.startScrub}
        >
          <div
            class="border-red pointer-events-none absolute z-[20] h-full w-[2px] border-r-2 border-red-700"
            style=${styleMap({
              left: `${this.pixelsPerMs * this.currentTimeMs}px`,
              top: `${this.timelineScrolltop}px`,
            })}
            ${ref(this.playheadRef)}
          ></div>

          ${renderFilmstripChildren(
            target ? ([target] as unknown as Element[]) : [],
            this.pixelsPerMs,
            this.hideSelectors,
            this.showSelectors,
            true,
          )}
        </div>
      </div>
    </div>`;
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

    if (this.autoScale) {
      this.updatePixelsPerMs();
    }
    super.willUpdate(changedProperties);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-filmstrip": EFFilmstrip;
    "ef-timegroup-hierarchy-item": EFTimegroupHierarchyItem;
    "ef-audio-hierarchy-item": EFAudioHierarchyItem;
    "ef-video-hierarchy-item": EFVideoHierarchyItem;
    "ef-captions-hierarchy-item": EFCaptionsHierarchyItem;
    "ef-captions-active-word-hierarchy-item": EFCaptionsActiveWordHierarchyItem;
    "ef-waveform-hierarchy-item": EFWaveformHierarchyItem;
    "ef-image-hierarchy-item": EFImageHierarchyItem;
    "ef-html-hierarchy-item": EFHTMLHierarchyItem;
    "ef-timegroup-filmstrip": EFTimegroupFilmstrip;
    "ef-audio-filmstrip": EFAudioFilmstrip;
    "ef-video-filmstrip": EFVideoFilmstrip;
    "ef-captions-filmstrip": EFCaptionsFilmstrip;
    "ef-captions-active-word-filmstrip": EFCaptionsActiveWordFilmstrip;
    "ef-captions-segment-filmstrip": EFCaptionsSegmentFilmstrip;
    "ef-captions-before-word-filmstrip": EFCaptionsBeforeWordFilmstrip;
    "ef-captions-after-word-filmstrip": EFCaptionsAfterWordFilmstrip;
    "ef-waveform-filmstrip": EFWaveformFilmstrip;
    "ef-image-filmstrip": EFImageFilmstrip;
    "ef-html-filmstrip": EFHTMLFilmstrip;
  }
}
