import { EFPanZoom as EFPanZoomElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const PanZoom = createComponent({
  tagName: "ef-pan-zoom",
  elementClass: EFPanZoomElement,
  react: React,
  displayName: "PanZoom",
  events: {
    onTransformChanged: "transform-changed",
  },
});
