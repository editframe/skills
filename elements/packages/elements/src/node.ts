/**
 * Node.js-safe exports from @editframe/elements
 * 
 * This file exports utilities that can be used in Node.js contexts
 * without importing browser-specific code (Web Components, HTMLElement, etc.)
 * 
 * Used by @editframe/cli and other Node.js tools.
 */

// Export types only (no runtime code that depends on browser APIs)
export type { RenderInfo } from "./getRenderInfo.js";
export type { EFTimegroup } from "./elements/EFTimegroup.js";
export type { ContainerInfo } from "./elements/ContainerInfo.js";
export type { ElementPositionInfo } from "./elements/ElementPositionInfo.js";

// Re-export getRenderInfo but only import it dynamically to avoid loading Web Components
// The CLI uses page.evaluate(getRenderInfo) which serializes the function anyway
export { getRenderInfo } from "./getRenderInfo.js";
