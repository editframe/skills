import { createContext } from "@lit/context";

/**
 * Context for overlay layer coordinate space.
 * Provided by EFOverlayLayer, contains the overlay layer's bounding rect.
 */
export interface OverlayLayerCoordinateSpace {
  overlayLayerRect: DOMRect;
}

export const overlayLayerContext = createContext<OverlayLayerCoordinateSpace | undefined>(
  Symbol("overlayLayer"),
);
