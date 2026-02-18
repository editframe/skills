/**
 * SSR-safe entry point for @editframe/elements
 *
 * This module exports ONLY types and SSR-safe utilities.
 * NO browser-specific code is imported at the module level.
 * NO Web Components or DOM APIs are loaded.
 *
 * Use this for:
 * - Server-side rendering (React Server Components, Remix loaders, etc.)
 * - Node.js tools that need type information
 * - Build-time utilities
 */

// Re-export only the getRenderInfo module which has no side effects
export { getRenderInfo, type RenderInfo } from "./getRenderInfo.js";

// Re-export types (these have no runtime code or side effects)
export type { EFTimegroup } from "./elements/EFTimegroup.js";
export type { EFMedia } from "./elements/EFMedia.js";
export type { EFCaptions } from "./elements/EFCaptions.js";
export type { EFImage } from "./elements/EFImage.js";
export type { EFAudio } from "./elements/EFAudio.js";
export type { EFVideo } from "./elements/EFVideo.js";
export type { EFText } from "./elements/EFText.js";
export type { EFWaveform } from "./elements/EFWaveform.js";
export type { ContainerInfo } from "./elements/ContainerInfo.js";
export type { ElementPositionInfo } from "./elements/ElementPositionInfo.js";

// Re-export render types (zero side effects, safe for SSR)
export type {
  RenderToVideoOptions,
  RenderProgress,
} from "./preview/renderTimegroupToVideo.types.js";
export type {
  ContentReadyMode,
  CaptureOptions,
  CanvasPreviewOptions,
  CanvasPreviewResult,
} from "./preview/renderTimegroupToCanvas.types.js";

// Re-export trace context type
export type { TraceContext } from "./otel/tracingHelpers.js";
