import { html, nothing, type TemplateResult } from "lit";
import { EFAudio } from "../../../elements/EFAudio.js";
import {
  EFCaptions,
  EFCaptionsActiveWord,
} from "../../../elements/EFCaptions.js";
import { EFImage } from "../../../elements/EFImage.js";
import { EFText } from "../../../elements/EFText.js";
import { EFTextSegment } from "../../../elements/EFTextSegment.js";
import { EFTimegroup } from "../../../elements/EFTimegroup.js";
import { EFVideo } from "../../../elements/EFVideo.js";
import { EFWaveform } from "../../../elements/EFWaveform.js";
import { shouldRenderElement } from "../../hierarchy/EFHierarchyItem.js";

// NOTE: Track components are NOT imported here to avoid circular dependencies.
// They must be pre-loaded elsewhere before this module is used.
// The custom elements (ef-audio-track, ef-video-track, etc.) are rendered
// via Lit templates which will work as long as the elements are registered.
// See preloadTracks.ts for the track component initialization.

export function renderTrackChildren(
  children: Element[],
  pixelsPerMs: number,
  hideSelectors?: string[],
  showSelectors?: string[],
  skipRootFiltering = false,
  enableTrim = false,
  useAbsolutePosition = false,
): Array<TemplateResult<1> | typeof nothing> {
  return children.map((child) => {
    if (
      !skipRootFiltering &&
      !shouldRenderElement(child, hideSelectors, showSelectors)
    ) {
      return nothing;
    }

    if (child instanceof EFTimegroup) {
      return html`<ef-timegroup-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      >
      </ef-timegroup-track>`;
    }
    if (child instanceof EFImage) {
      return html`<ef-image-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-image-track>`;
    }
    if (child instanceof EFAudio) {
      return html`<ef-audio-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-audio-track>`;
    }
    if (child instanceof EFVideo) {
      return html`<ef-video-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-video-track>`;
    }
    if (child instanceof EFCaptions) {
      return html`<ef-captions-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-track>`;
    }
    if (child instanceof EFCaptionsActiveWord) {
      return html`<ef-captions-active-word-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-active-word-track>`;
    }
    if (child instanceof EFText) {
      return html`<ef-text-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-text-track>`;
    }
    if (child instanceof EFTextSegment) {
      return html`<ef-text-segment-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-text-segment-track>`;
    }
    if (child.tagName === "EF-CAPTIONS-SEGMENT") {
      return html`<ef-captions-segment-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-segment-track>`;
    }
    if (child.tagName === "EF-CAPTIONS-BEFORE-ACTIVE-WORD") {
      return html`<ef-captions-before-word-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-before-word-track>`;
    }
    if (child.tagName === "EF-CAPTIONS-AFTER-ACTIVE-WORD") {
      return html`<ef-captions-after-word-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-captions-after-word-track>`;
    }
    if (child instanceof EFWaveform) {
      return html`<ef-waveform-track
        .element=${child}
        pixels-per-ms=${pixelsPerMs}
        ?enable-trim=${enableTrim}
        ?use-absolute-position=${useAbsolutePosition}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-waveform-track>`;
    }
    return nothing;
  });
}
