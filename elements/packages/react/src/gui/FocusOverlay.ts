import { EFFocusOverlay as EFFocusOverlayElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const FocusOverlay = createComponent({
  tagName: "ef-focus-overlay",
  elementClass: EFFocusOverlayElement,
  react: React,
});
