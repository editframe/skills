import { EFOverlayLayer as EFOverlayLayerElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

// OverlayLayer discovers PanZoom automatically via:
// - Lit context (if PanZoom is ancestor)
// - Direct DOM query (if PanZoom is sibling)
// No React props needed for coordination!

export const OverlayLayer = createComponent<EFOverlayLayerElement, {}>({
  tagName: "ef-overlay-layer",
  elementClass: EFOverlayLayerElement,
  react: React,
  displayName: "OverlayLayer",
});
