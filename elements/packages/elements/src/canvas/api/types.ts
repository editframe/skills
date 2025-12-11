/**
 * Core types for the canvas system.
 */

/**
 * Selection state enumeration.
 */
export type SelectionState = "none" | "single" | "multiple" | "box-selecting";

/**
 * Element bounds interface - elements can implement this to override default bounding rect.
 * This allows elements to provide custom hit testing areas or account for visual bounds
 * that differ from DOM bounds.
 */
export interface CanvasElementBounds {
  getCanvasBounds(): DOMRect;
}

/**
 * Canvas element metadata for API/manipulation.
 * Positions and dimensions are in canvas coordinate space.
 */
export interface CanvasElementData {
  id: string;
  element: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/**
 * Transform context from parent (e.g., EFPanZoom).
 */
export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Canvas data structure for export/import.
 */
export interface CanvasData {
  elements: CanvasElementData[];
  groups: Array<{ id: string; elementIds: string[] }>;
}






