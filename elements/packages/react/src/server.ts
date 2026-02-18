/**
 * SSR-safe entry point for @editframe/react
 *
 * This module exports ONLY React components that can be safely used in SSR contexts.
 * NO browser-specific utilities are loaded at the module level.
 *
 * Use this for:
 * - Server-side rendering (React Server Components, Remix loaders, Next.js pages)
 * - Pre-rendering static HTML
 */

// Re-export SSR-safe React components
export { Audio } from "./elements/Audio.js";
export {
  Captions,
  CaptionsActiveWord,
  CaptionsAfterActiveWord,
  CaptionsBeforeActiveWord,
  CaptionsSegment,
} from "./elements/Captions.js";
export { Text, TextSegment } from "./elements/Text.js";
export { Image } from "./elements/Image.js";
export { Surface } from "./elements/Surface.js";
export { Timegroup } from "./elements/Timegroup.js";
export { Video } from "./elements/Video.js";
export { Waveform } from "./elements/Waveform.js";
export { PanZoom } from "./elements/PanZoom.js";

// Re-export types from @editframe/elements/server
export type {
  RenderToVideoOptions,
  RenderProgress,
  ContentReadyMode,
  CaptureOptions,
  CanvasPreviewOptions,
  CanvasPreviewResult,
} from "@editframe/elements/server";
