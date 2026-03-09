/**
 * Node.js-safe entry point for @editframe/elements
 *
 * This module exports only the getRenderInfo function and types needed by Node.js tools
 * WITHOUT importing any Web Components or browser-specific code.
 *
 * Used by @editframe/cli to avoid loading HTMLElement definitions in Node.js.
 */

// Re-export only the getRenderInfo module which has no side effects
export { getRenderInfo, RenderInfoSchema, type RenderInfo } from "./getRenderInfo.js";

// Re-export types (these have no runtime code)
export type { EFTimegroup } from "./elements/EFTimegroup.js";
export type { EFMedia } from "./elements/EFMedia.js";
export type { EFCaptions } from "./elements/EFCaptions.js";
export type { EFImage } from "./elements/EFImage.js";
export type { ContainerInfo } from "./elements/ContainerInfo.js";
export type { ElementPositionInfo } from "./elements/ElementPositionInfo.js";
