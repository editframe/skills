/**
 * Utility to check if we're in a browser environment
 */
export const isBrowser = typeof window !== "undefined" && typeof HTMLElement !== "undefined";

/**
 * Stub class for HTMLElement in Node.js environments
 * This allows class definitions to be parsed without errors
 */
export const HTMLElementCompat = (isBrowser ? HTMLElement : class {}) as typeof HTMLElement;

/**
 * Stub class for SVGElement in Node.js environments
 */
export const SVGElementCompat = (isBrowser ? (typeof SVGElement !== "undefined" ? SVGElement : class {}) : class {}) as typeof SVGElement;
