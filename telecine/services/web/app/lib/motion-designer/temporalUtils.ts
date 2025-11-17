import type { ElementNode } from "./types.js";

/**
 * Checks if an ElementNode represents a temporal element.
 * 
 * Temporal elements are those that use the EFTemporal mixin from the elements package.
 * In the motion-designer, these correspond to:
 * - timegroup (EFTimegroup)
 * - text (EFText)
 * - image (EFImage)
 * - video (EFVideo)
 * - audio (EFAudio)
 * - captions (EFCaptions)
 * - waveform (EFWaveform)
 * - surface (EFSurface)
 * 
 * Non-temporal elements:
 * - div (regular div element)
 * 
 * @param element The ElementNode to check
 * @returns true if the element is temporal, false otherwise
 */
export function isTemporalElement(element: ElementNode): boolean {
  const temporalTypes = ["timegroup", "text", "image", "video", "audio", "captions", "waveform", "surface"];
  return temporalTypes.includes(element.type);
}

