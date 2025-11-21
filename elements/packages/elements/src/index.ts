import "./elements/EFTimegroup.js";

export { EFTimegroup } from "./elements/EFTimegroup.js";

import "./elements/EFImage.js";

export { EFImage } from "./elements/EFImage.js";

import "./elements/EFMedia.js";

export type { EFMedia } from "./elements/EFMedia.js";

import "./elements/EFAudio.js";

export { EFAudio } from "./elements/EFAudio.js";

import "./elements/EFVideo.js";

export { EFVideo } from "./elements/EFVideo.js";

import "./elements/EFCaptions.js";

export {
  EFCaptions,
  EFCaptionsActiveWord,
  EFCaptionsAfterActiveWord,
  EFCaptionsBeforeActiveWord,
  EFCaptionsSegment,
} from "./elements/EFCaptions.js";

import "./elements/EFText.js";
import "./elements/EFTextSegment.js";

export { EFText } from "./elements/EFText.js";
export { EFTextSegment } from "./elements/EFTextSegment.js";

import "./elements/EFWaveform.js";

export { EFWaveform } from "./elements/EFWaveform.js";

import "./elements/EFTemporal.js";

export { isEFTemporal } from "./elements/EFTemporal.js";
export type { TemporalMixinInterface } from "./elements/EFTemporal.js";

import "./gui/EFConfiguration.ts";

export { EFConfiguration } from "./gui/EFConfiguration.ts";

import "./gui/EFWorkbench.js";

export { EFWorkbench } from "./gui/EFWorkbench.js";

import "./gui/EFPreview.js";

export { EFPreview } from "./gui/EFPreview.js";

import "./gui/EFFilmstrip.js";

export { EFFilmstrip } from "./gui/EFFilmstrip.js";

import "./gui/EFTogglePlay.js";

export { EFTogglePlay } from "./gui/EFTogglePlay.js";

import "./gui/EFPlay.js";

export { EFPlay } from "./gui/EFPlay.js";

import "./gui/EFPause.js";

export { EFPause } from "./gui/EFPause.js";

import "./gui/EFToggleLoop.js";

export { EFToggleLoop } from "./gui/EFToggleLoop.js";

import "./gui/EFScrubber.js";

export { EFScrubber } from "./gui/EFScrubber.js";

import "./gui/EFTimeDisplay.js";

export { EFTimeDisplay } from "./gui/EFTimeDisplay.js";

import "./gui/EFDial.js";

export { type DialChangeDetail, EFDial } from "./gui/EFDial.js";

import "./gui/EFControls.js";

export { EFControls } from "./gui/EFControls.js";

import "./gui/EFFocusOverlay.js";

export { EFFocusOverlay } from "./gui/EFFocusOverlay.js";

import "./gui/transformUtils.js";

import "./gui/EFTransformHandles.ts";

export { type TransformBounds, EFTransformHandles } from "./gui/EFTransformHandles.ts";

import "./gui/EFResizableBox.ts";

export { type BoxBounds, EFResizableBox } from "./gui/EFResizableBox.ts";

import "./gui/EFFitScale.js";

export { EFFitScale } from "./gui/EFFitScale.js";

import "./elements/EFSurface.ts";

export { EFSurface } from "./elements/EFSurface.ts";

import "./elements/EFThumbnailStrip.ts";

export { EFThumbnailStrip } from "./elements/EFThumbnailStrip.ts";

if (typeof window !== "undefined") {
  // @ts-expect-error
  window.EF_REGISTERED = true;
}

import "./EF_FRAMEGEN.js";

export { getRenderInfo, RenderInfo } from "./getRenderInfo.js";
export type { TraceContext } from "./otel/tracingHelpers.js";
