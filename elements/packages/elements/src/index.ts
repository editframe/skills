import "./elements/EFTimegroup.js";
import "./sandbox/index.js";

export { EFTimegroup } from "./elements/EFTimegroup.js";
export type { ContainerInfo } from "./elements/ContainerInfo.js";
export { getContainerInfoFromElement } from "./elements/ContainerInfo.js";
export type { ElementPositionInfo } from "./elements/ElementPositionInfo.js";
export {
  getPositionInfoFromElement,
  PositionInfoMixin,
} from "./elements/ElementPositionInfo.js";
export { needsFitScale, elementNeedsFitScale } from "./gui/FitScaleHelpers.js";

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

import "./gui/hierarchy/EFHierarchy.js";
import "./gui/hierarchy/EFHierarchyItem.js";

export { EFHierarchy } from "./gui/hierarchy/EFHierarchy.js";
export {
  EFHierarchyItem,
  EFTimegroupHierarchyItem,
  EFAudioHierarchyItem,
  EFVideoHierarchyItem,
  EFCaptionsHierarchyItem,
  EFCaptionsActiveWordHierarchyItem,
  EFTextHierarchyItem,
  EFTextSegmentHierarchyItem,
  EFWaveformHierarchyItem,
  EFImageHierarchyItem,
  EFHTMLHierarchyItem,
} from "./gui/hierarchy/EFHierarchyItem.js";
export type {
  HierarchyState,
  HierarchyActions,
  HierarchyContext,
} from "./gui/hierarchy/hierarchyContext.js";
export { hierarchyContext } from "./gui/hierarchy/hierarchyContext.js";

// Generic tree component
import "./gui/tree/EFTree.js";
import "./gui/tree/EFTreeItem.js";

export { EFTree } from "./gui/tree/EFTree.js";
export { EFTreeItem } from "./gui/tree/EFTreeItem.js";
export type {
  TreeItem,
  TreeState,
  TreeActions,
  TreeContext,
} from "./gui/tree/treeContext.js";
export { treeContext, collectAllIds } from "./gui/tree/treeContext.js";

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

import "./gui/EFActiveRootTemporal.js";

export { EFActiveRootTemporal } from "./gui/EFActiveRootTemporal.js";

import "./gui/EFDial.js";

export { type DialChangeDetail, EFDial } from "./gui/EFDial.js";

import "./gui/EFControls.js";

export { EFControls } from "./gui/EFControls.js";

import "./gui/EFFocusOverlay.js";

export { EFFocusOverlay } from "./gui/EFFocusOverlay.js";

import "./gui/transformUtils.js";

export {
  getCornerPoint,
  getOppositeCorner,
  rotatePoint,
} from "./gui/transformUtils.js";

import "./gui/EFTransformHandles.ts";

export {
  type TransformBounds,
  EFTransformHandles,
} from "./gui/EFTransformHandles.ts";

import "./gui/EFResizableBox.ts";

export { type BoxBounds, EFResizableBox } from "./gui/EFResizableBox.ts";

import "./gui/EFFitScale.js";

export { EFFitScale } from "./gui/EFFitScale.js";

import "./elements/EFSurface.ts";

export { EFSurface } from "./elements/EFSurface.ts";

import "./elements/EFThumbnailStrip.ts";

export { EFThumbnailStrip } from "./elements/EFThumbnailStrip.ts";

import "./elements/EFPanZoom.js";

export { EFPanZoom } from "./elements/EFPanZoom.js";
export type { PanZoomTransform } from "./elements/EFPanZoom.js";

import "./canvas/EFCanvas.js";
import "./canvas/EFCanvasItem.js";

export { EFCanvas } from "./canvas/EFCanvas.js";
export { EFCanvasItem } from "./canvas/EFCanvasItem.js";
export { CanvasAPI } from "./canvas/api/CanvasAPI.js";
export type {
  CanvasElementData,
  SelectionState,
  CanvasElementBounds,
} from "./canvas/api/types.js";
export { SelectionModel } from "./canvas/selection/SelectionModel.js";

import "./gui/EFOverlayLayer.ts";

export { EFOverlayLayer } from "./gui/EFOverlayLayer.ts";

import "./gui/EFOverlayItem.ts";

export { EFOverlayItem } from "./gui/EFOverlayItem.ts";
export type { OverlayItemPosition } from "./gui/EFOverlayItem.ts";

import "./gui/EFTimelineRuler.ts";

export {
  EFTimelineRuler,
  quantizeToFrameTimeMs,
  calculateFrameIntervalMs,
  calculatePixelsPerFrame,
  shouldShowFrameMarkers,
} from "./gui/EFTimelineRuler.ts";

import "./gui/timeline/EFTimeline.js";
import "./gui/timeline/TrimHandles.js";

export { EFTimeline } from "./gui/timeline/EFTimeline.js";
export {
  EFTrimHandles,
  type TrimChangeDetail,
} from "./gui/timeline/TrimHandles.js";

if (typeof window !== "undefined") {
  // @ts-expect-error
  window.EF_REGISTERED = true;
}

import "./EF_FRAMEGEN.js";

// Initialize render API
import "./render/EFRenderAPI.js";

export { getRenderInfo, RenderInfo } from "./getRenderInfo.js";
export { getRenderData } from "./render/getRenderData.js";
export type {
  RenderToVideoOptions,
  RenderProgress,
} from "./preview/renderTimegroupToVideo.js";
export type { TraceContext } from "./otel/tracingHelpers.js";

// Element-to-canvas rendering
export {
  renderElementToCanvas,
  type RenderElementOptions,
} from "./preview/renderElementToCanvas.js";
